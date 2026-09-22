<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProductUnitController extends Controller
{
    public function index(
        Request $request,
    ): JsonResponse {
        $validated =
            $request->validate([
                'search' => [
                    'nullable',
                    'string',
                    'max:80',
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

        $perPage =
            (int) (
                $validated['per_page']
                ?? 20
            );

        $units =
            ProductUnit::query()
                ->when(
                    $search !== '',
                    fn(
                        Builder $query,
                    ) =>
                        $query->where(
                            'name',
                            'like',
                            "%{$search}%",
                        ),
                )
                ->orderBy(
                    'name',
                )
                ->paginate(
                    $perPage,
                );

        return response()->json([
            'data' =>
                collect(
                    $units->items(),
                )
                    ->map(
                        fn(
                            ProductUnit $unit,
                        ): array =>
                            $this->unitData(
                                $unit,
                            ),
                    )
                    ->values(),

            'meta' => [
                'current_page' =>
                    $units->currentPage(),

                'last_page' =>
                    $units->lastPage(),

                'per_page' =>
                    $units->perPage(),

                'total' =>
                    $units->total(),

                'from' =>
                    $units->firstItem(),

                'to' =>
                    $units->lastItem(),
            ],
        ]);
    }

    public function options(): JsonResponse
    {
        $units =
            ProductUnit::query()
                ->orderBy(
                    'name',
                )
                ->get([
                    'id',
                    'name',
                ]);

        return response()->json([
            'data' =>
                $units
                    ->map(
                        fn(
                            ProductUnit $unit,
                        ): array => [
                            'id' =>
                                $unit->id,

                            'name' =>
                                $unit->name,
                        ],
                    )
                    ->values(),
        ]);
    }

    public function store(
        Request $request,
    ): JsonResponse {
        $validated =
            $request->validate([
                'name' => [
                    'required',
                    'string',
                    'max:80',
                    Rule::unique(
                        'product_units',
                        'name',
                    ),
                ],
            ]);

        $name =
            $this->normaliseName(
                $validated['name'],
            );

        $this->ensureNormalisedNameIsUnique(
            $name,
        );

        $unit =
            ProductUnit::query()
                ->create([
                    'name' =>
                        $name,
                ]);

        return response()->json([
            'message' =>
                'Product unit created successfully.',

            'data' =>
                $this->unitData(
                    $unit,
                ),
        ], 201);
    }

    public function update(
        Request $request,
        ProductUnit $productUnit,
    ): JsonResponse {
        $validated =
            $request->validate([
                'name' => [
                    'required',
                    'string',
                    'max:80',
                    Rule::unique(
                        'product_units',
                        'name',
                    )->ignore(
                        $productUnit->id,
                    ),
                ],
            ]);

        $name =
            $this->normaliseName(
                $validated['name'],
            );

        $this->ensureNormalisedNameIsUnique(
            $name,
            $productUnit->id,
        );

        if (
            $name !== $productUnit->name
            && $this->isInUse(
                $productUnit->name,
            )
        ) {
            throw ValidationException::withMessages([
                'name' => [
                    'This unit is already used by one or more products or package variants. '
                    . 'Change those products first before renaming the unit.',
                ],
            ]);
        }

        $productUnit->forceFill([
            'name' =>
                $name,
        ]);

        $productUnit->save();

        return response()->json([
            'message' =>
                'Product unit updated successfully.',

            'data' =>
                $this->unitData(
                    $productUnit,
                ),
        ]);
    }

    public function destroy(
        ProductUnit $productUnit,
    ): JsonResponse {
        if (
            $this->isInUse(
                $productUnit->name,
            )
        ) {
            throw ValidationException::withMessages([
                'product_unit' => [
                    'This unit cannot be deleted because it is currently used by one or more products or package variants.',
                ],
            ]);
        }

        $productUnit->delete();

        return response()->json([
            'message' =>
                'Product unit deleted successfully.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function unitData(
        ProductUnit $unit,
    ): array {
        $usage =
            $this->usageCounts(
                $unit->name,
            );

        return [
            'id' =>
                $unit->id,

            'name' =>
                $unit->name,

            'product_count' =>
                $usage[
                    'products'
                ],

            'variant_count' =>
                $usage[
                    'variants'
                ],

            'is_in_use' =>
                (
                    $usage[
                        'products'
                    ]
                    + $usage[
                        'variants'
                    ]
                ) > 0,

            'created_at' =>
                $unit
                    ->created_at
                    ?->toISOString(),

            'updated_at' =>
                $unit
                    ->updated_at
                    ?->toISOString(),
        ];
    }

    /**
     * @return array{
     *     products: int,
     *     variants: int
     * }
     */
    private function usageCounts(
        string $name,
    ): array {
        return [
            'products' =>
                Product::query()
                    ->where(
                        'unit',
                        $name,
                    )
                    ->count(),

            'variants' =>
                ProductVariant::query()
                    ->where(
                        'package_unit',
                        $name,
                    )
                    ->count(),
        ];
    }

    private function isInUse(
        string $name,
    ): bool {
        $usage =
            $this->usageCounts(
                $name,
            );

        return (
            $usage['products']
            + $usage['variants']
        ) > 0;
    }

    private function normaliseName(
        mixed $value,
    ): string {
        $name =
            preg_replace(
                '/\s+/u',
                ' ',
                trim(
                    (string) $value,
                ),
            )
            ?? '';

        if ($name === '') {
            throw ValidationException::withMessages([
                'name' => [
                    'Please enter a product unit name.',
                ],
            ]);
        }

        return $name;
    }

    private function ensureNormalisedNameIsUnique(
        string $name,
        ?int $ignoreId = null,
    ): void {
        $query =
            ProductUnit::query()
                ->whereRaw(
                    'LOWER(name) = ?',
                    [
                        mb_strtolower(
                            $name,
                        ),
                    ],
                );

        if ($ignoreId !== null) {
            $query->whereKeyNot(
                $ignoreId,
            );
        }

        if ($query->exists()) {
            throw ValidationException::withMessages([
                'name' => [
                    'This product unit already exists.',
                ],
            ]);
        }
    }
}
