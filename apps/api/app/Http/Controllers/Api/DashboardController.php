<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalePayment;
use App\Models\SaleReturn;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function admin(
        Request $request,
    ): JsonResponse {
        $user = $request->user();

        if (
            ! $user instanceof User
            || ! $user->isAdmin()
        ) {
            return response()->json([
                'message' =>
                'Administrator access is required.',
            ], 403);
        }

        $today =
            now()->toDateString();

        $periodStart =
            now()
            ->subDays(6)
            ->startOfDay();

        $periodEnd =
            now()->endOfDay();

        $todaySalesQuery =
            Sale::query()
            ->whereDate(
                'sale_date',
                $today,
            );

        $todaySalesCount =
            (clone $todaySalesQuery)
            ->count();

        $todaySalesTotal =
            (float) (
                (clone $todaySalesQuery)
                ->sum('grand_total')
            );

        $todayDueSales =
            (float) (
                (clone $todaySalesQuery)
                ->sum('due_amount')
            );

        $todayGrossProfit =
            (float) (
                (clone $todaySalesQuery)
                ->sum('gross_profit')
            );

        $todaySaleNetProfit =
            (float) (
                (clone $todaySalesQuery)
                ->sum('net_profit')
            );

        $todayCollectedAmount =
            (float) SalePayment::query()
                ->whereDate(
                    'created_at',
                    $today,
                )
                ->sum('amount');

        $todayExpenses =
            (float) Expense::query()
                ->whereDate(
                    'expense_date',
                    $today,
                )
                ->sum('amount');

        $todayReturnRefund =
            (float) SaleReturn::query()
                ->whereDate(
                    'return_date',
                    $today,
                )
                ->sum('refund_amount');

        $todayProfitReversal =
            (float) SaleReturn::query()
                ->whereDate(
                    'return_date',
                    $today,
                )
                ->sum('profit_reversal');

        $todayNetProfit =
            round(
                $todaySaleNetProfit
                    - $todayProfitReversal
                    - $todayExpenses,
                2,
            );

        $outstandingDue =
            (float) Sale::query()
                ->sum('due_amount');

        $stockSummary =
            DB::table('stock_batches')
            ->where(
                'available_quantity',
                '>',
                0,
            )
            ->selectRaw(
                '
                        COALESCE(
                            SUM(available_quantity),
                            0
                        ) AS total_quantity,

                        COALESCE(
                            SUM(
                                available_quantity
                                * purchase_cost
                            ),
                            0
                        ) AS purchase_value,

                        COALESCE(
                            SUM(
                                available_quantity
                                * selling_price
                            ),
                            0
                        ) AS retail_value
                    ',
            )
            ->first();

        $expiringBatchCount =
            DB::table('stock_batches')
            ->where(
                'available_quantity',
                '>',
                0,
            )
            ->whereNotNull(
                'expiry_date',
            )
            ->whereBetween(
                'expiry_date',
                [
                    $today,
                    now()
                        ->addDays(30)
                        ->toDateString(),
                ],
            )
            ->count();

        $expiredBatchCount =
            DB::table('stock_batches')
            ->where(
                'available_quantity',
                '>',
                0,
            )
            ->whereNotNull(
                'expiry_date',
            )
            ->whereDate(
                'expiry_date',
                '<',
                $today,
            )
            ->count();

        $outOfStockProductQuery =
            DB::table('products')
            ->leftJoin(
                'stock_batches',
                'stock_batches.product_id',
                '=',
                'products.id',
            )
            ->select(
                'products.id',
            )
            ->groupBy(
                'products.id',
            )
            ->havingRaw(
                '
                        COALESCE(
                            SUM(
                                stock_batches.available_quantity
                            ),
                            0
                        ) <= 0
                    ',
            );

        $outOfStockProducts =
            DB::query()
            ->fromSub(
                $outOfStockProductQuery,
                'out_of_stock_products',
            )
            ->count();

        $dailySeries =
            $this->adminDailySeries(
                $periodStart,
                $periodEnd,
            );

        $paymentBreakdown =
            SalePayment::query()
            ->whereDate(
                'created_at',
                $today,
            )
            ->selectRaw(
                '
                        payment_method,
                        COUNT(*) AS transactions,
                        COALESCE(
                            SUM(amount),
                            0
                        ) AS total
                    ',
            )
            ->groupBy(
                'payment_method',
            )
            ->orderByDesc('total')
            ->get()
            ->map(
                fn(
                    SalePayment $payment,
                ): array => [
                    'payment_method' =>
                    $payment
                        ->payment_method,

                    'transactions' =>
                    (int) $payment
                        ->transactions,

                    'total' =>
                    (float) $payment
                        ->total,
                ],
            )
            ->values();

        $topProducts =
            DB::table('sale_items')
            ->join(
                'sales',
                'sales.id',
                '=',
                'sale_items.sale_id',
            )
            ->join(
                'products',
                'products.id',
                '=',
                'sale_items.product_id',
            )
            ->whereDate(
                'sales.sale_date',
                '>=',
                now()
                    ->subDays(29)
                    ->toDateString(),
            )
            ->selectRaw(
                '
                        products.id,
                        products.name,
                        products.unit,
                        SUM(sale_items.quantity)
                            AS quantity_sold,
                        SUM(sale_items.line_total)
                            AS sales_total,
                        SUM(sale_items.gross_profit)
                            AS gross_profit
                    ',
            )
            ->groupBy(
                'products.id',
                'products.name',
                'products.unit',
            )
            ->orderByDesc(
                'quantity_sold',
            )
            ->limit(8)
            ->get()
            ->map(
                fn(
                    object $product,
                ): array => [
                    'id' =>
                    (int) $product->id,

                    'name' =>
                    (string) $product->name,

                    'unit' =>
                    (string) $product->unit,

                    'quantity_sold' =>
                    (float) $product
                        ->quantity_sold,

                    'sales_total' =>
                    (float) $product
                        ->sales_total,

                    'gross_profit' =>
                    (float) $product
                        ->gross_profit,
                ],
            )
            ->values();

        $recentSales =
            Sale::query()
            ->with([
                'customer:id,customer_code,name,mobile',

                'createdBy:id,name,username',

                'payments' =>
                fn($query) =>
                $query
                    ->select([
                        'id',
                        'sale_id',
                        'payment_method',
                        'amount',
                    ])
                    ->orderBy('id'),
            ])
            ->withCount('items')
            ->latest('sale_date')
            ->latest('id')
            ->limit(8)
            ->get()
            ->map(
                fn(
                    Sale $sale,
                ): array =>
                $this->saleData(
                    $sale,
                ),
            )
            ->values();

        $recentExpenses =
            Expense::query()
            ->with([
                'category:id,name',

                'createdBy:id,name,username',
            ])
            ->latest('expense_date')
            ->latest('id')
            ->limit(8)
            ->get()
            ->map(
                fn(
                    Expense $expense,
                ): array => [
                    'id' =>
                    $expense->id,

                    'expense_number' =>
                    $expense
                        ->expense_number,

                    'expense_date' =>
                    $expense
                        ->expense_date
                        ->format('Y-m-d'),

                    'description' =>
                    $expense
                        ->description,

                    'amount' =>
                    (float) $expense
                        ->amount,

                    'payment_method' =>
                    $expense
                        ->payment_method,

                    'category' => [
                        'id' =>
                        $expense
                            ->category
                            ->id,

                        'name' =>
                        $expense
                            ->category
                            ->name,
                    ],

                    'created_by' => [
                        'id' =>
                        $expense
                            ->createdBy
                            ->id,

                        'name' =>
                        $expense
                            ->createdBy
                            ->name,
                    ],
                ],
            )
            ->values();

        return response()->json([
            'data' => [
                'summary' => [
                    'today_sales_count' =>
                    $todaySalesCount,

                    'today_sales_total' =>
                    $todaySalesTotal,

                    'today_collected_amount' =>
                    $todayCollectedAmount,

                    'today_due_sales' =>
                    $todayDueSales,

                    'outstanding_due' =>
                    $outstandingDue,

                    'today_expenses' =>
                    $todayExpenses,

                    'today_return_refund' =>
                    $todayReturnRefund,

                    'today_gross_profit' =>
                    $todayGrossProfit,

                    'today_net_profit' =>
                    $todayNetProfit,

                    'stock_quantity' =>
                    (float) (
                        $stockSummary
                        ?->total_quantity
                        ?? 0
                    ),

                    'stock_purchase_value' =>
                    (float) (
                        $stockSummary
                        ?->purchase_value
                        ?? 0
                    ),

                    'stock_retail_value' =>
                    (float) (
                        $stockSummary
                        ?->retail_value
                        ?? 0
                    ),

                    'expiring_batch_count' =>
                    $expiringBatchCount,

                    'expired_batch_count' =>
                    $expiredBatchCount,

                    'out_of_stock_products' =>
                    $outOfStockProducts,
                ],

                'daily_series' =>
                $dailySeries,

                'payment_breakdown' =>
                $paymentBreakdown,

                'top_products' =>
                $topProducts,

                'recent_sales' =>
                $recentSales,

                'recent_expenses' =>
                $recentExpenses,

                'generated_at' =>
                now()->toISOString(),
            ],
        ]);
    }

    public function cashier(
        Request $request,
    ): JsonResponse {
        $user = $request->user();

        if (! $user instanceof User) {
            return response()->json([
                'message' =>
                'Unauthenticated.',
            ], 401);
        }

        $today =
            now()->toDateString();

        $periodStart =
            now()
            ->subDays(6)
            ->startOfDay();

        $periodEnd =
            now()->endOfDay();

        $todaySalesQuery =
            Sale::query()
            ->where(
                'created_by',
                $user->id,
            )
            ->whereDate(
                'sale_date',
                $today,
            );

        $todaySalesCount =
            (clone $todaySalesQuery)
            ->count();

        $todaySalesTotal =
            (float) (
                (clone $todaySalesQuery)
                ->sum('grand_total')
            );

        $todayDueSales =
            (float) (
                (clone $todaySalesQuery)
                ->sum('due_amount')
            );

        $todayCustomers =
            (clone $todaySalesQuery)
            ->whereNotNull(
                'customer_id',
            )
            ->distinct(
                'customer_id',
            )
            ->count(
                'customer_id',
            );

        $todayCollectedAmount =
            (float) SalePayment::query()
                ->where(
                    'created_by',
                    $user->id,
                )
                ->whereDate(
                    'created_at',
                    $today,
                )
                ->sum('amount');

        $todayReturnCount =
            SaleReturn::query()
            ->where(
                'created_by',
                $user->id,
            )
            ->whereDate(
                'return_date',
                $today,
            )
            ->count();

        $todayReturnRefund =
            (float) SaleReturn::query()
                ->where(
                    'created_by',
                    $user->id,
                )
                ->whereDate(
                    'return_date',
                    $today,
                )
                ->sum('refund_amount');

        $dailySeries =
            $this->cashierDailySeries(
                $user,
                $periodStart,
                $periodEnd,
            );

        $paymentBreakdown =
            SalePayment::query()
            ->where(
                'created_by',
                $user->id,
            )
            ->whereDate(
                'created_at',
                $today,
            )
            ->selectRaw(
                '
                        payment_method,
                        COUNT(*) AS transactions,
                        COALESCE(
                            SUM(amount),
                            0
                        ) AS total
                    ',
            )
            ->groupBy(
                'payment_method',
            )
            ->orderByDesc('total')
            ->get()
            ->map(
                fn(
                    SalePayment $payment,
                ): array => [
                    'payment_method' =>
                    $payment
                        ->payment_method,

                    'transactions' =>
                    (int) $payment
                        ->transactions,

                    'total' =>
                    (float) $payment
                        ->total,
                ],
            )
            ->values();

        $recentSales =
            Sale::query()
            ->where(
                'created_by',
                $user->id,
            )
            ->with([
                'customer:id,customer_code,name,mobile',

                'createdBy:id,name,username',

                'payments' =>
                fn($query) =>
                $query
                    ->select([
                        'id',
                        'sale_id',
                        'payment_method',
                        'amount',
                    ])
                    ->orderBy('id'),
            ])
            ->withCount('items')
            ->latest('sale_date')
            ->latest('id')
            ->limit(10)
            ->get()
            ->map(
                fn(
                    Sale $sale,
                ): array =>
                $this->saleData(
                    $sale,
                ),
            )
            ->values();

        return response()->json([
            'data' => [
                'summary' => [
                    'today_sales_count' =>
                    $todaySalesCount,

                    'today_sales_total' =>
                    $todaySalesTotal,

                    'today_collected_amount' =>
                    $todayCollectedAmount,

                    'today_due_sales' =>
                    $todayDueSales,

                    'today_return_count' =>
                    $todayReturnCount,

                    'today_return_refund' =>
                    $todayReturnRefund,

                    'today_registered_customers' =>
                    $todayCustomers,
                ],

                'daily_series' =>
                $dailySeries,

                'payment_breakdown' =>
                $paymentBreakdown,

                'recent_sales' =>
                $recentSales,

                'generated_at' =>
                now()->toISOString(),
            ],
        ]);
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function adminDailySeries(
        Carbon $start,
        Carbon $end,
    ): Collection {
        $sales =
            Sale::query()
            ->whereBetween(
                'sale_date',
                [
                    $start,
                    $end,
                ],
            )
            ->selectRaw(
                '
                        DATE(sale_date)
                            AS report_date,

                        COALESCE(
                            SUM(grand_total),
                            0
                        ) AS total
                    ',
            )
            ->groupBy(
                'report_date',
            )
            ->pluck(
                'total',
                'report_date',
            );

        $collections =
            SalePayment::query()
            ->whereBetween(
                'created_at',
                [
                    $start,
                    $end,
                ],
            )
            ->selectRaw(
                '
                        DATE(created_at)
                            AS report_date,

                        COALESCE(
                            SUM(amount),
                            0
                        ) AS total
                    ',
            )
            ->groupBy(
                'report_date',
            )
            ->pluck(
                'total',
                'report_date',
            );

        $expenses =
            Expense::query()
            ->whereBetween(
                'expense_date',
                [
                    $start->toDateString(),
                    $end->toDateString(),
                ],
            )
            ->selectRaw(
                '
                        expense_date
                            AS report_date,

                        COALESCE(
                            SUM(amount),
                            0
                        ) AS total
                    ',
            )
            ->groupBy(
                'report_date',
            )
            ->pluck(
                'total',
                'report_date',
            );

        $returns =
            SaleReturn::query()
            ->whereBetween(
                'return_date',
                [
                    $start,
                    $end,
                ],
            )
            ->selectRaw(
                '
                        DATE(return_date)
                            AS report_date,

                        COALESCE(
                            SUM(refund_amount),
                            0
                        ) AS total
                    ',
            )
            ->groupBy(
                'report_date',
            )
            ->pluck(
                'total',
                'report_date',
            );

        return $this->buildDailySeries(
            $start,
            $end,
            $sales,
            $collections,
            $expenses,
            $returns,
        );
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function cashierDailySeries(
        User $user,
        Carbon $start,
        Carbon $end,
    ): Collection {
        $sales =
            Sale::query()
            ->where(
                'created_by',
                $user->id,
            )
            ->whereBetween(
                'sale_date',
                [
                    $start,
                    $end,
                ],
            )
            ->selectRaw(
                '
                        DATE(sale_date)
                            AS report_date,

                        COALESCE(
                            SUM(grand_total),
                            0
                        ) AS total
                    ',
            )
            ->groupBy(
                'report_date',
            )
            ->pluck(
                'total',
                'report_date',
            );

        $collections =
            SalePayment::query()
            ->where(
                'created_by',
                $user->id,
            )
            ->whereBetween(
                'created_at',
                [
                    $start,
                    $end,
                ],
            )
            ->selectRaw(
                '
                        DATE(created_at)
                            AS report_date,

                        COALESCE(
                            SUM(amount),
                            0
                        ) AS total
                    ',
            )
            ->groupBy(
                'report_date',
            )
            ->pluck(
                'total',
                'report_date',
            );

        $returns =
            SaleReturn::query()
            ->where(
                'created_by',
                $user->id,
            )
            ->whereBetween(
                'return_date',
                [
                    $start,
                    $end,
                ],
            )
            ->selectRaw(
                '
                        DATE(return_date)
                            AS report_date,

                        COALESCE(
                            SUM(refund_amount),
                            0
                        ) AS total
                    ',
            )
            ->groupBy(
                'report_date',
            )
            ->pluck(
                'total',
                'report_date',
            );

        return $this->buildDailySeries(
            $start,
            $end,
            $sales,
            $collections,
            collect(),
            $returns,
        );
    }

    /**
     * @param Collection<string, mixed> $sales
     * @param Collection<string, mixed> $collections
     * @param Collection<string, mixed> $expenses
     * @param Collection<string, mixed> $returns
     *
     * @return Collection<int, array<string, mixed>>
     */
    private function buildDailySeries(
        Carbon $start,
        Carbon $end,
        Collection $sales,
        Collection $collections,
        Collection $expenses,
        Collection $returns,
    ): Collection {
        $series = collect();

        $date =
            $start->copy();

        while (
            $date->lte($end)
        ) {
            $key =
                $date->toDateString();

            $series->push([
                'date' =>
                $key,

                'label' =>
                $date->format('D'),

                'sales' =>
                (float) (
                    $sales->get($key)
                    ?? 0
                ),

                'collections' =>
                (float) (
                    $collections->get($key)
                    ?? 0
                ),

                'expenses' =>
                (float) (
                    $expenses->get($key)
                    ?? 0
                ),

                'returns' =>
                (float) (
                    $returns->get($key)
                    ?? 0
                ),
            ]);

            $date->addDay();
        }

        return $series;
    }

    /**
     * @return array<string, mixed>
     */
    private function saleData(
        Sale $sale,
    ): array {
        $firstPayment =
            $sale->payments->first();

        return [
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

            'payment_status' =>
            $sale
                ->payment_status,

            'payment_method' =>
            $firstPayment
                ? $firstPayment
                ->payment_method
                : null,

            'items_count' =>
            (int) (
                $sale->items_count
                ?? 0
            ),

            'customer' =>
            $sale->customer
                ? [
                    'id' =>
                    $sale
                        ->customer
                        ->id,

                    'customer_code' =>
                    $sale
                        ->customer
                        ->customer_code,

                    'name' =>
                    $sale
                        ->customer
                        ->name,

                    'mobile' =>
                    $sale
                        ->customer
                        ->mobile,
                ]
                : null,

            'created_by' => [
                'id' =>
                $sale->createdBy->id,

                'name' =>
                $sale
                    ->createdBy
                    ->name,

                'username' =>
                $sale
                    ->createdBy
                    ->username,
            ],
        ];
    }
}
