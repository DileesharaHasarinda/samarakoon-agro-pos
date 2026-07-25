<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Category\StoreCategoryRequest;
use App\Http\Requests\Category\UpdateCategoryRequest;
use App\Models\Category;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index(
        Request $request,
    ): JsonResponse {
        $validated = $request->validate([
            'search' => [
                'nullable',
                'string',
                'max:120',
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

        $perPage = (int) (
            $validated['per_page']
            ?? 10
        );

        $categories = Category::query()
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
            $categories->items(),
        )
            ->map(
                fn(
                    Category $category,
                ): array => $this->categoryData(
                    $category,
                ),
            )
            ->values();

        return response()->json([
            'data' => $data,

            'meta' => [
                'current_page' =>
                $categories->currentPage(),

                'last_page' =>
                $categories->lastPage(),

                'per_page' =>
                $categories->perPage(),

                'total' =>
                $categories->total(),

                'from' =>
                $categories->firstItem(),

                'to' =>
                $categories->lastItem(),
            ],
        ]);
    }

    public function options(): JsonResponse
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

    public function store(
        StoreCategoryRequest $request,
    ): JsonResponse {
        $category = Category::query()
            ->create(
                $request->validated(),
            );

        return response()->json([
            'message' =>
            'Category created successfully.',

            'data' =>
            $this->categoryData($category),
        ], 201);
    }

    public function show(
        Category $category,
    ): JsonResponse {
        return response()->json([
            'data' =>
            $this->categoryData($category),
        ]);
    }

    public function update(
        UpdateCategoryRequest $request,
        Category $category,
    ): JsonResponse {
        $category->update(
            $request->validated(),
        );

        $category->refresh();

        return response()->json([
            'message' =>
            'Category updated successfully.',

            'data' =>
            $this->categoryData($category),
        ]);
    }

    public function destroy(
        Category $category,
    ): JsonResponse {
        if (
            $category
            ->products()
            ->exists()
        ) {
            return response()->json([
                'message' =>
                'This category cannot be deleted because products are assigned to it. Delete or move those products first.',
            ], 409);
        }

        $categoryName =
            $category->name;

        $category->delete();

        return response()->json([
            'message' =>
            "{$categoryName} deleted successfully.",
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function categoryData(
        Category $category,
    ): array {
        return [
            'id' => $category->id,

            'name' => $category->name,

            'description' =>
            $category->description,

            'created_at' =>
            $category
                ->created_at
                ?->toISOString(),

            'updated_at' =>
            $category
                ->updated_at
                ?->toISOString(),
        ];
    }
}
