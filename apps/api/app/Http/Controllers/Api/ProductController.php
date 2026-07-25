<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Product\StoreProductRequest;
use App\Http\Requests\Product\UpdateProductRequest;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
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
            ?? 10
        );

        $products = Product::query()
            ->with([
                'category:id,name',
            ])
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
                                    'description',
                                    'like',
                                    "%{$search}%",
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
                ): array => $this->productData(
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

    public function store(
        StoreProductRequest $request,
    ): JsonResponse {
        $product = Product::query()
            ->create(
                $request->validated(),
            );

        $product->load([
            'category:id,name',
        ]);

        return response()->json([
            'message' =>
            'Product created successfully.',

            'data' =>
            $this->productData($product),
        ], 201);
    }

    public function show(
        Product $product,
    ): JsonResponse {
        $product->load([
            'category:id,name',
        ]);

        return response()->json([
            'data' =>
            $this->productData($product),
        ]);
    }

    public function update(
        UpdateProductRequest $request,
        Product $product,
    ): JsonResponse {
        $product->update(
            $request->validated(),
        );

        $product->refresh();

        $product->load([
            'category:id,name',
        ]);

        return response()->json([
            'message' =>
            'Product updated successfully.',

            'data' =>
            $this->productData($product),
        ]);
    }

    public function destroy(
        Product $product,
    ): JsonResponse {
        $productName = $product->name;

        $product->delete();

        return response()->json([
            'message' =>
            "{$productName} deleted successfully.",
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function productData(
        Product $product,
    ): array {
        return [
            'id' => $product->id,

            'category_id' =>
            $product->category_id,

            'name' => $product->name,

            'sku' => $product->sku,

            'barcode' =>
            $product->barcode,

            'description' =>
            $product->description,

            'cost_price' =>
            (float) $product->cost_price,

            'selling_price' =>
            (float) $product->selling_price,

            'reorder_level' =>
            $product->reorder_level,

            'unit' => $product->unit,

            'expiry_date' =>
            $product
                ->expiry_date
                ?->format('Y-m-d'),

            'category' => [
                'id' =>
                $product->category->id,

                'name' =>
                $product->category->name,
            ],

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
