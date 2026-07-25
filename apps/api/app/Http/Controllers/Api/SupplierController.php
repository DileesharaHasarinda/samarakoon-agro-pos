<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Supplier\StoreSupplierRequest;
use App\Http\Requests\Supplier\UpdateSupplierRequest;
use App\Models\Supplier;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends Controller
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

        $suppliers = Supplier::query()
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
                                    'contact_person',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'phone',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'secondary_phone',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'email',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'address',
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
            $suppliers->items(),
        )
            ->map(
                fn(
                    Supplier $supplier,
                ): array => $this->supplierData(
                    $supplier,
                ),
            )
            ->values();

        return response()->json([
            'data' => $data,

            'meta' => [
                'current_page' =>
                $suppliers->currentPage(),

                'last_page' =>
                $suppliers->lastPage(),

                'per_page' =>
                $suppliers->perPage(),

                'total' =>
                $suppliers->total(),

                'from' =>
                $suppliers->firstItem(),

                'to' =>
                $suppliers->lastItem(),
            ],
        ]);
    }

    public function options(): JsonResponse
    {
        $suppliers = Supplier::query()
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'phone',
            ])
            ->map(
                fn(
                    Supplier $supplier,
                ): array => [
                    'id' => $supplier->id,
                    'name' => $supplier->name,
                    'phone' => $supplier->phone,
                ],
            )
            ->values();

        return response()->json([
            'data' => $suppliers,
        ]);
    }

    public function store(
        StoreSupplierRequest $request,
    ): JsonResponse {
        $supplier = Supplier::query()
            ->create(
                $request->validated(),
            );

        return response()->json([
            'message' =>
            'Supplier created successfully.',

            'data' =>
            $this->supplierData($supplier),
        ], 201);
    }

    public function show(
        Supplier $supplier,
    ): JsonResponse {
        return response()->json([
            'data' =>
            $this->supplierData($supplier),
        ]);
    }

    public function update(
        UpdateSupplierRequest $request,
        Supplier $supplier,
    ): JsonResponse {
        $supplier->update(
            $request->validated(),
        );

        $supplier->refresh();

        return response()->json([
            'message' =>
            'Supplier updated successfully.',

            'data' =>
            $this->supplierData($supplier),
        ]);
    }

    public function destroy(
        Supplier $supplier,
    ): JsonResponse {
        $supplierName =
            $supplier->name;

        $supplier->delete();

        return response()->json([
            'message' =>
            "{$supplierName} deleted successfully.",
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function supplierData(
        Supplier $supplier,
    ): array {
        return [
            'id' => $supplier->id,

            'name' => $supplier->name,

            'contact_person' =>
            $supplier->contact_person,

            'phone' => $supplier->phone,

            'secondary_phone' =>
            $supplier->secondary_phone,

            'email' => $supplier->email,

            'address' => $supplier->address,

            'notes' => $supplier->notes,

            'created_at' =>
            $supplier
                ->created_at
                ?->toISOString(),

            'updated_at' =>
            $supplier
                ->updated_at
                ?->toISOString(),
        ];
    }
}
