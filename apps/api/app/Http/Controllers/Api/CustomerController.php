<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreCustomerRequest;
use App\Http\Requests\Customer\UpdateCustomerRequest;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
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

        $customers = Customer::query()
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
                                    'customer_code',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'name',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'mobile',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'secondary_mobile',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'email',
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
            ->withCount('sales')
            ->withSum(
                'sales as outstanding_due',
                'due_amount',
            )
            ->latest('id')
            ->paginate($perPage);

        return response()->json([
            'data' =>
            collect(
                $customers->items(),
            )
                ->map(
                    fn(
                        Customer $customer,
                    ): array =>
                    $this->customerData(
                        $customer,
                    ),
                )
                ->values(),

            'meta' => [
                'current_page' =>
                $customers->currentPage(),

                'last_page' =>
                $customers->lastPage(),

                'per_page' =>
                $customers->perPage(),

                'total' =>
                $customers->total(),

                'from' =>
                $customers->firstItem(),

                'to' =>
                $customers->lastItem(),
            ],
        ]);
    }

    public function options(
        Request $request,
    ): JsonResponse {
        $validated = $request->validate([
            'search' => [
                'nullable',
                'string',
                'max:160',
            ],
        ]);

        $search = trim(
            (string) (
                $validated['search']
                ?? ''
            ),
        );

        $customers = Customer::query()
            ->where(
                'is_active',
                true,
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
                                    'mobile',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'customer_code',
                                    'like',
                                    "%{$search}%",
                                );
                        },
                    );
                },
            )
            ->withSum(
                'sales as outstanding_due',
                'due_amount',
            )
            ->orderBy('name')
            ->limit(30)
            ->get();

        return response()->json([
            'data' =>
            $customers
                ->map(
                    fn(
                        Customer $customer,
                    ): array =>
                    $this->customerData(
                        $customer,
                    ),
                )
                ->values(),
        ]);
    }

    public function store(
        StoreCustomerRequest $request,
    ): JsonResponse {
        $user = $request->user();

        if (! $user instanceof User) {
            return response()->json([
                'message' =>
                'Unauthenticated.',
            ], 401);
        }

        $customer = DB::transaction(
            function () use (
                $request,
                $user,
            ): Customer {
                $customer =
                    Customer::query()
                    ->create([
                        ...$request->validated(),

                        'customer_code' =>
                        null,

                        'created_by' =>
                        $user->id,
                    ]);

                $customer->update([
                    'customer_code' =>
                    sprintf(
                        'CUS-%06d',
                        $customer->id,
                    ),
                ]);

                return $customer;
            },
        );

        $customer->loadSum(
            'sales as outstanding_due',
            'due_amount',
        );

        $customer->loadCount('sales');

        return response()->json([
            'message' =>
            'Customer created successfully.',

            'data' =>
            $this->customerData(
                $customer,
            ),
        ], 201);
    }

    public function show(
        Customer $customer,
    ): JsonResponse {
        $customer->loadCount('sales');

        $customer->loadSum(
            'sales as outstanding_due',
            'due_amount',
        );

        $customer->load([
            'sales' =>
            fn($query) =>
            $query
                ->with([
                    'payments:id,sale_id,payment_method,payment_type,amount,reference_number,created_at',
                ])
                ->latest('sale_date')
                ->limit(100),
        ]);

        return response()->json([
            'data' => [
                ...$this->customerData(
                    $customer,
                ),

                'sales' =>
                $customer->sales
                    ->map(
                        fn($sale): array => [
                            'id' =>
                            $sale->id,

                            'sale_number' =>
                            $sale->sale_number,

                            'sale_date' =>
                            $sale
                                ->sale_date
                                ->toISOString(),

                            'grand_total' =>
                            (float) $sale
                                ->grand_total,

                            'paid_amount' =>
                            (float) $sale
                                ->paid_amount,

                            'due_amount' =>
                            (float) $sale
                                ->due_amount,

                            'due_date' =>
                            $sale
                                ->due_date
                                ?->format('Y-m-d'),

                            'payment_status' =>
                            $sale
                                ->payment_status,

                            'payments' =>
                            $sale->payments
                                ->map(
                                    fn($payment): array => [
                                        'id' =>
                                        $payment->id,

                                        'payment_method' =>
                                        $payment
                                            ->payment_method,

                                        'payment_type' =>
                                        $payment
                                            ->payment_type,

                                        'amount' =>
                                        (float) $payment
                                            ->amount,

                                        'reference_number' =>
                                        $payment
                                            ->reference_number,

                                        'created_at' =>
                                        $payment
                                            ->created_at
                                            ?->toISOString(),
                                    ],
                                )
                                ->values(),
                        ],
                    )
                    ->values(),
            ],
        ]);
    }

    public function update(
        UpdateCustomerRequest $request,
        Customer $customer,
    ): JsonResponse {
        $customer->update(
            $request->validated(),
        );

        $customer->loadCount('sales');

        $customer->loadSum(
            'sales as outstanding_due',
            'due_amount',
        );

        return response()->json([
            'message' =>
            'Customer updated successfully.',

            'data' =>
            $this->customerData(
                $customer,
            ),
        ]);
    }

    public function destroy(
        Request $request,
        Customer $customer,
    ): JsonResponse {
        $user = $request->user();

        if (
            ! $user instanceof User
            || ! $user->isAdmin()
        ) {
            return response()->json([
                'message' =>
                'Only administrators can delete customers.',
            ], 403);
        }

        if ($customer->sales()->exists()) {
            return response()->json([
                'message' =>
                'This customer has sales history and cannot be deleted. Set the customer as inactive instead.',
            ], 422);
        }

        $customer->delete();

        return response()->json([
            'message' =>
            'Customer deleted successfully.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function customerData(
        Customer $customer,
    ): array {
        return [
            'id' =>
            $customer->id,

            'customer_code' =>
            $customer->customer_code,

            'name' =>
            $customer->name,

            'mobile' =>
            $customer->mobile,

            'secondary_mobile' =>
            $customer
                ->secondary_mobile,

            'email' =>
            $customer->email,

            'address' =>
            $customer->address,

            'customer_type' =>
            $customer
                ->customer_type,

            'credit_limit' =>
            (float) $customer
                ->credit_limit,

            'outstanding_due' =>
            (float) (
                $customer
                ->outstanding_due
                ?? 0
            ),

            'sales_count' =>
            (int) (
                $customer
                ->sales_count
                ?? 0
            ),

            'notes' =>
            $customer->notes,

            'is_active' =>
            (bool) $customer
                ->is_active,

            'created_at' =>
            $customer
                ->created_at
                ?->toISOString(),

            'updated_at' =>
            $customer
                ->updated_at
                ?->toISOString(),
        ];
    }
}
