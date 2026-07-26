<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Barcode\UpdateProductBarcodeRequest;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class BarcodeController
extends Controller
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

                'barcode_status' => [
                    'nullable',

                    Rule::in([
                        'all',
                        'assigned',
                        'missing',
                    ]),
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

        $search =
            trim(
                (string) (
                    $validated['search']
                    ?? ''
                ),
            );

        $barcodeStatus =
            $validated['barcode_status'] ?? 'all';

        $categoryId =
            $validated['category_id'] ?? null;

        $perPage =
            (int) (
                $validated['per_page']
                ?? 20
            );

        $today =
            today()
            ->toDateString();

        $query =
            Product::query()
            ->select(
                'products.*',
            )
            ->with(
                'category:id,name',
            )
            ->selectSub(
                function (
                    $priceQuery,
                ) use ($today): void {
                    $priceQuery
                        ->from(
                            'stock_batches',
                        )
                        ->selectRaw(
                            'MIN(selling_price)',
                        )
                        ->whereColumn(
                            'stock_batches.product_id',
                            'products.id',
                        )
                        ->where(
                            'available_quantity',
                            '>',
                            0,
                        )
                        ->where(
                            function (
                                $expiryQuery,
                            ) use ($today): void {
                                $expiryQuery
                                    ->whereNull(
                                        'expiry_date',
                                    )
                                    ->orWhereDate(
                                        'expiry_date',
                                        '>=',
                                        $today,
                                    );
                            },
                        );
                },
                'current_selling_price',
            )
            ->selectSub(
                function (
                    $stockQuery,
                ) use ($today): void {
                    $stockQuery
                        ->from(
                            'stock_batches',
                        )
                        ->selectRaw(
                            'COALESCE(SUM(available_quantity), 0)',
                        )
                        ->whereColumn(
                            'stock_batches.product_id',
                            'products.id',
                        )
                        ->where(
                            'available_quantity',
                            '>',
                            0,
                        )
                        ->where(
                            function (
                                $expiryQuery,
                            ) use ($today): void {
                                $expiryQuery
                                    ->whereNull(
                                        'expiry_date',
                                    )
                                    ->orWhereDate(
                                        'expiry_date',
                                        '>=',
                                        $today,
                                    );
                            },
                        );
                },
                'total_available_quantity',
            )
            ->when(
                $search !== '',
                function (
                    Builder $productQuery,
                ) use ($search): void {
                    $productQuery->where(
                        function (
                            Builder $searchQuery,
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
                                );
                        },
                    );
                },
            )
            ->when(
                $categoryId !== null,
                fn(
                    Builder $productQuery,
                ) => $productQuery->where(
                    'products.category_id',
                    $categoryId,
                ),
            )
            ->when(
                $barcodeStatus
                    === 'assigned',
                fn(
                    Builder $productQuery,
                ) => $productQuery
                    ->whereNotNull(
                        'products.barcode',
                    )
                    ->where(
                        'products.barcode',
                        '<>',
                        '',
                    ),
            )
            ->when(
                $barcodeStatus
                    === 'missing',
                fn(
                    Builder $productQuery,
                ) => $productQuery
                    ->where(
                        function (
                            Builder $missingQuery,
                        ): void {
                            $missingQuery
                                ->whereNull(
                                    'products.barcode',
                                )
                                ->orWhere(
                                    'products.barcode',
                                    '',
                                );
                        },
                    ),
            )
            ->orderBy(
                'products.name',
            );

        $summary = [
            'total_products' =>
            Product::query()
                ->count(),

            'assigned_barcodes' =>
            Product::query()
                ->whereNotNull(
                    'barcode',
                )
                ->where(
                    'barcode',
                    '<>',
                    '',
                )
                ->count(),

            'missing_barcodes' =>
            Product::query()
                ->where(
                    function (
                        Builder $missingQuery,
                    ): void {
                        $missingQuery
                            ->whereNull(
                                'barcode',
                            )
                            ->orWhere(
                                'barcode',
                                '',
                            );
                    },
                )
                ->count(),
        ];

        $products =
            $query->paginate(
                $perPage,
            );

        return response()->json([
            'data' =>
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
                ->values(),

            'summary' =>
            $summary,

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
                $products->total(),

                'from' =>
                $products
                    ->firstItem(),

                'to' =>
                $products
                    ->lastItem(),
            ],
        ]);
    }

    public function update(
        UpdateProductBarcodeRequest $request,
        Product $product,
    ): JsonResponse {
        $product->forceFill([
            'barcode' =>
            $request->validated()['barcode'],
        ]);

        $product->save();

        return response()->json([
            'message' =>
            $product->barcode
                ? 'Product barcode updated successfully.'
                : 'Product barcode removed successfully.',

            'data' =>
            $this->productData(
                $product->fresh(
                    'category:id,name',
                ),
            ),
        ]);
    }

    public function generate(
        Product $product,
    ): JsonResponse {
        if (
            is_string(
                $product->barcode,
            )
            && trim(
                $product->barcode,
            ) !== ''
        ) {
            throw ValidationException::withMessages([
                    'barcode' => [
                        'This product already has a barcode.',
                    ],
                ]);
        }

        $barcode =
            $this->generateBarcode(
                $product,
            );

        $product->forceFill([
            'barcode' =>
            $barcode,
        ]);

        $product->save();

        return response()->json([
            'message' =>
            'Product barcode generated successfully.',

            'data' =>
            $this->productData(
                $product->fresh(
                    'category:id,name',
                ),
            ),
        ]);
    }

    public function generateMissing(
        Request $request,
    ): JsonResponse {
        $validated =
            $request->validate([
                'product_ids' => [
                    'nullable',
                    'array',
                    'max:500',
                ],

                'product_ids.*' => [
                    'integer',
                    'distinct',
                    'exists:products,id',
                ],
            ]);

        $productIds =
            $validated['product_ids'] ?? [];

        $query =
            Product::query()
            ->where(
                function (
                    Builder $missingQuery,
                ): void {
                    $missingQuery
                        ->whereNull(
                            'barcode',
                        )
                        ->orWhere(
                            'barcode',
                            '',
                        );
                },
            )
            ->when(
                count($productIds) > 0,
                fn(
                    Builder $productQuery,
                ) => $productQuery
                    ->whereIn(
                        'id',
                        $productIds,
                    ),
            )
            ->orderBy('id');

        $generated = 0;

        DB::transaction(
            function () use (
                $query,
                &$generated,
            ): void {
                $products =
                    $query
                    ->lockForUpdate()
                    ->get();

                foreach (
                    $products
                    as $product
                ) {
                    $product->forceFill([
                        'barcode' =>
                        $this
                            ->generateBarcode(
                                $product,
                            ),
                    ]);

                    $product->save();

                    $generated++;
                }
            },
            3,
        );

        return response()->json([
            'message' =>
            $generated === 1
                ? 'One missing barcode was generated.'
                : "{$generated} missing barcodes were generated.",

            'data' => [
                'generated_count' =>
                $generated,
            ],
        ]);
    }

    private function generateBarcode(
        Product $product,
    ): string {
        /*
         * Internal Code 128 value:
         *
         * SA + 10-digit product ID
         *
         * Examples:
         * SA0000000001
         * SA0000000125
         */
        $barcode =
            'SA'
            . str_pad(
                (string) $product->id,
                10,
                '0',
                STR_PAD_LEFT,
            );

        $exists =
            Product::query()
            ->where(
                'barcode',
                $barcode,
            )
            ->where(
                'id',
                '<>',
                $product->id,
            )
            ->exists();

        if (! $exists) {
            return $barcode;
        }

        do {
            $barcode =
                'SA'
                . str_pad(
                    (string) $product->id,
                    10,
                    '0',
                    STR_PAD_LEFT,
                )
                . strtoupper(
                    substr(
                        bin2hex(
                            random_bytes(2),
                        ),
                        0,
                        4,
                    ),
                );

            $exists =
                Product::query()
                ->where(
                    'barcode',
                    $barcode,
                )
                ->where(
                    'id',
                    '<>',
                    $product->id,
                )
                ->exists();
        } while ($exists);

        return $barcode;
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
            (bool) (
                $product->is_active
                ?? true
            ),

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

            'current_selling_price' =>
            $product
                ->current_selling_price
                !== null
                ? (float) $product
                    ->current_selling_price
                : null,

            'total_available_quantity' =>
            (float) (
                $product
                ->total_available_quantity
                ?? 0
            ),
        ];
    }
}
