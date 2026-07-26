<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ExpenseCategory\StoreExpenseCategoryRequest;
use App\Http\Requests\ExpenseCategory\UpdateExpenseCategoryRequest;
use App\Models\ExpenseCategory;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseCategoryController extends Controller
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

            'status' => [
                'nullable',
                'in:active,inactive',
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

        $status =
            $validated['status']
            ?? null;

        $perPage = (int) (
            $validated['per_page']
            ?? 20
        );

        $categories =
            ExpenseCategory::query()
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
            ->when(
                $status === 'active',
                fn(
                    Builder $query,
                ) => $query->where(
                    'is_active',
                    true,
                ),
            )
            ->when(
                $status === 'inactive',
                fn(
                    Builder $query,
                ) => $query->where(
                    'is_active',
                    false,
                ),
            )
            ->withCount('expenses')
            ->orderBy('name')
            ->paginate($perPage);

        return response()->json([
            'data' =>
            collect(
                $categories->items(),
            )
                ->map(
                    fn(
                        ExpenseCategory $category,
                    ): array =>
                    $this->categoryData(
                        $category,
                    ),
                )
                ->values(),

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
        $categories =
            ExpenseCategory::query()
            ->where(
                'is_active',
                true,
            )
            ->withCount('expenses')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' =>
            $categories
                ->map(
                    fn(
                        ExpenseCategory $category,
                    ): array =>
                    $this->categoryData(
                        $category,
                    ),
                )
                ->values(),
        ]);
    }

    public function store(
        StoreExpenseCategoryRequest $request,
    ): JsonResponse {
        $user = $request->user();

        if (! $user instanceof User) {
            return response()->json([
                'message' =>
                'Unauthenticated.',
            ], 401);
        }

        $category =
            ExpenseCategory::query()
            ->create([
                ...$request->validated(),

                'created_by' =>
                $user->id,
            ]);

        $category->loadCount(
            'expenses',
        );

        return response()->json([
            'message' =>
            'Expense category created successfully.',

            'data' =>
            $this->categoryData(
                $category,
            ),
        ], 201);
    }

    public function show(
        ExpenseCategory $expenseCategory,
    ): JsonResponse {
        $expenseCategory->loadCount(
            'expenses',
        );

        return response()->json([
            'data' =>
            $this->categoryData(
                $expenseCategory,
            ),
        ]);
    }

    public function update(
        UpdateExpenseCategoryRequest $request,
        ExpenseCategory $expenseCategory,
    ): JsonResponse {
        $expenseCategory->update(
            $request->validated(),
        );

        $expenseCategory->loadCount(
            'expenses',
        );

        return response()->json([
            'message' =>
            'Expense category updated successfully.',

            'data' =>
            $this->categoryData(
                $expenseCategory,
            ),
        ]);
    }

    public function destroy(
        ExpenseCategory $expenseCategory,
    ): JsonResponse {
        if (
            $expenseCategory
            ->expenses()
            ->exists()
        ) {
            return response()->json([
                'message' =>
                'This category contains expense records and cannot be deleted. Set it as inactive instead.',
            ], 422);
        }

        $expenseCategory->delete();

        return response()->json([
            'message' =>
            'Expense category deleted successfully.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function categoryData(
        ExpenseCategory $category,
    ): array {
        return [
            'id' =>
            $category->id,

            'name' =>
            $category->name,

            'description' =>
            $category->description,

            'is_active' =>
            (bool) $category
                ->is_active,

            'expenses_count' =>
            (int) (
                $category
                ->expenses_count
                ?? 0
            ),

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
