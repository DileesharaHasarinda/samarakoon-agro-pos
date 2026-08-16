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
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
    private const BUSINESS_TIME_ZONE =
    'Asia/Colombo';

    public function overview(
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

        $validated = $request->validate([
            'date_from' => [
                'nullable',
                'date_format:Y-m-d',
            ],

            'date_to' => [
                'nullable',
                'date_format:Y-m-d',
                'after_or_equal:date_from',
            ],

            'payment_method' => [
                'nullable',

                Rule::in([
                    SalePayment::METHOD_CASH,
                    SalePayment::METHOD_CARD,
                    SalePayment::METHOD_BANK_TRANSFER,
                ]),
            ],

            'payment_status' => [
                'nullable',

                Rule::in([
                    Sale::PAYMENT_STATUS_PAID,
                    Sale::PAYMENT_STATUS_PARTIAL,
                    Sale::PAYMENT_STATUS_DUE,
                ]),
            ],
        ]);

        $businessNow =
            Carbon::now(
                self::BUSINESS_TIME_ZONE,
            );

        $dateFrom =
            $validated['date_from']
            ?? $businessNow
            ->copy()
            ->startOfMonth()
            ->toDateString();

        $dateTo =
            $validated['date_to']
            ?? $businessNow
            ->toDateString();

        $paymentMethod =
            $validated['payment_method']
            ?? null;

        $paymentStatus =
            $validated['payment_status']
            ?? null;

        /*
         * Report dates are business-calendar dates in Sri Lanka.
         *
         * sale_date and application timestamps are stored/handled as UTC,
         * so convert the inclusive Sri Lanka date range to an equivalent
         * UTC half-open interval: [start, next-day-start).
         */
        $businessStart =
            Carbon::createFromFormat(
                'Y-m-d',
                $dateFrom,
                self::BUSINESS_TIME_ZONE,
            )
            ->startOfDay();

        $businessEndDate =
            Carbon::createFromFormat(
                'Y-m-d',
                $dateTo,
                self::BUSINESS_TIME_ZONE,
            )
            ->startOfDay();

        $startUtc =
            $businessStart
            ->copy()
            ->utc();

        $endExclusiveUtc =
            $businessEndDate
            ->copy()
            ->addDay()
            ->startOfDay()
            ->utc();

        $salesQuery =
            Sale::query()
            ->where(
                'sale_date',
                '>=',
                $startUtc,
            )
            ->where(
                'sale_date',
                '<',
                $endExclusiveUtc,
            )
            ->when(
                $paymentStatus !== null,
                fn(
                    Builder $query,
                ) => $query->where(
                    'payment_status',
                    $paymentStatus,
                ),
            )
            ->when(
                $paymentMethod !== null,
                fn(
                    Builder $query,
                ) => $query->whereHas(
                    'payments',
                    fn(
                        Builder $paymentQuery,
                    ) => $paymentQuery->where(
                        'payment_method',
                        $paymentMethod,
                    ),
                ),
            );

        $salesSummary =
            (clone $salesQuery)
            ->selectRaw(
                '
                        COUNT(*) AS sales_count,

                        COALESCE(
                            SUM(grand_total),
                            0
                        ) AS sales_total,

                        COALESCE(
                            SUM(paid_amount),
                            0
                        ) AS sale_paid_amount,

                        COALESCE(
                            SUM(due_amount),
                            0
                        ) AS due_amount,

                        COALESCE(
                            SUM(
                                item_discount_total
                                + discount
                            ),
                            0
                        ) AS discount_total,

                        COALESCE(
                            SUM(gross_profit),
                            0
                        ) AS gross_profit,

                        COALESCE(
                            SUM(net_profit),
                            0
                        ) AS sale_net_profit
                    ',
            )
            ->first();

        $saleIds =
            (clone $salesQuery)
            ->select('sales.id');

        $collectionQuery =
            SalePayment::query()
            ->whereIn(
                'sale_id',
                clone $saleIds,
            )
            ->where(
                'created_at',
                '>=',
                $startUtc,
            )
            ->where(
                'created_at',
                '<',
                $endExclusiveUtc,
            )
            ->when(
                $paymentMethod !== null,
                fn(
                    Builder $query,
                ) => $query->where(
                    'payment_method',
                    $paymentMethod,
                ),
            );

        $collectedAmount =
            (float) (
                (clone $collectionQuery)
                ->sum('amount')
            );

        $returnQuery =
            SaleReturn::query()
            ->whereIn(
                'sale_id',
                clone $saleIds,
            )
            ->where(
                'return_date',
                '>=',
                $startUtc,
            )
            ->where(
                'return_date',
                '<',
                $endExclusiveUtc,
            );

        $returnSummary =
            (clone $returnQuery)
            ->selectRaw(
                '
                        COUNT(*) AS return_count,

                        COALESCE(
                            SUM(refund_amount),
                            0
                        ) AS refund_amount,

                        COALESCE(
                            SUM(profit_reversal),
                            0
                        ) AS profit_reversal,

                        COALESCE(
                            SUM(restocked_quantity),
                            0
                        ) AS restocked_quantity
                    ',
            )
            ->first();

        $expenseQuery =
            Expense::query()
            ->whereBetween(
                'expense_date',
                [
                    $dateFrom,
                    $dateTo,
                ],
            );

        $expenseSummary =
            (clone $expenseQuery)
            ->selectRaw(
                '
                        COUNT(*) AS expense_count,

                        COALESCE(
                            SUM(amount),
                            0
                        ) AS expense_total
                    ',
            )
            ->first();

        $saleNetProfit =
            (float) (
                $salesSummary
                ?->sale_net_profit
                ?? 0
            );

        $profitReversal =
            (float) (
                $returnSummary
                ?->profit_reversal
                ?? 0
            );

        $expenseTotal =
            (float) (
                $expenseSummary
                ?->expense_total
                ?? 0
            );

        $finalNetProfit =
            round(
                $saleNetProfit
                    - $profitReversal
                    - $expenseTotal,
                2,
            );

        $dailySeries =
            $this->dailySeries(
                $businessStart,
                $businessEndDate,
                $salesQuery,
                $collectionQuery,
                $expenseQuery,
                $returnQuery,
            );

        $paymentBreakdown =
            (clone $collectionQuery)
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

        $productPerformance =
            DB::table('sale_items')
            ->join(
                'products',
                'products.id',
                '=',
                'sale_items.product_id',
            )
            ->join(
                'categories',
                'categories.id',
                '=',
                'products.category_id',
            )
            ->whereIn(
                'sale_items.sale_id',
                clone $saleIds,
            )
            ->selectRaw(
                '
                        products.id,
                        products.name,
                        products.unit,

                        categories.id
                            AS category_id,

                        categories.name
                            AS category_name,

                        SUM(sale_items.quantity)
                            AS quantity_sold,

                        SUM(sale_items.line_total)
                            AS sales_total,

                        SUM(
                            sale_items.quantity
                            * sale_items.purchase_cost
                        ) AS cost_total,

                        SUM(sale_items.gross_profit)
                            AS gross_profit
                    ',
            )
            ->groupBy(
                'products.id',
                'products.name',
                'products.unit',
                'categories.id',
                'categories.name',
            )
            ->orderByDesc(
                'sales_total',
            )
            ->limit(50)
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

                    'category' => [
                        'id' =>
                        (int) $product
                            ->category_id,

                        'name' =>
                        (string) $product
                            ->category_name,
                    ],

                    'quantity_sold' =>
                    (float) $product
                        ->quantity_sold,

                    'sales_total' =>
                    (float) $product
                        ->sales_total,

                    'cost_total' =>
                    (float) $product
                        ->cost_total,

                    'gross_profit' =>
                    (float) $product
                        ->gross_profit,
                ],
            )
            ->values();

        $expenseCategories =
            DB::table('expenses')
            ->join(
                'expense_categories',
                'expense_categories.id',
                '=',
                'expenses.expense_category_id',
            )
            ->whereBetween(
                'expenses.expense_date',
                [
                    $dateFrom,
                    $dateTo,
                ],
            )
            ->selectRaw(
                '
                        expense_categories.id,
                        expense_categories.name,

                        COUNT(expenses.id)
                            AS expense_count,

                        SUM(expenses.amount)
                            AS total_amount
                    ',
            )
            ->groupBy(
                'expense_categories.id',
                'expense_categories.name',
            )
            ->orderByDesc(
                'total_amount',
            )
            ->get()
            ->map(
                fn(
                    object $category,
                ): array => [
                    'id' =>
                    (int) $category->id,

                    'name' =>
                    (string) $category->name,

                    'expense_count' =>
                    (int) $category
                        ->expense_count,

                    'total_amount' =>
                    (float) $category
                        ->total_amount,
                ],
            )
            ->values();

        $customerDues =
            DB::table('sales')
            ->join(
                'customers',
                'customers.id',
                '=',
                'sales.customer_id',
            )
            ->whereIn(
                'sales.id',
                clone $saleIds,
            )
            ->where(
                'sales.due_amount',
                '>',
                0,
            )
            ->selectRaw(
                '
                        customers.id,
                        customers.customer_code,
                        customers.name,
                        customers.mobile,

                        COUNT(sales.id)
                            AS due_sales,

                        SUM(sales.grand_total)
                            AS sales_total,

                        SUM(sales.paid_amount)
                            AS paid_amount,

                        SUM(sales.due_amount)
                            AS due_amount
                    ',
            )
            ->groupBy(
                'customers.id',
                'customers.customer_code',
                'customers.name',
                'customers.mobile',
            )
            ->orderByDesc(
                'due_amount',
            )
            ->limit(50)
            ->get()
            ->map(
                fn(
                    object $customer,
                ): array => [
                    'id' =>
                    (int) $customer->id,

                    'customer_code' =>
                    (string) $customer
                        ->customer_code,

                    'name' =>
                    (string) $customer->name,

                    'mobile' =>
                    $customer->mobile
                        ? (string) $customer
                            ->mobile
                        : null,

                    'due_sales' =>
                    (int) $customer
                        ->due_sales,

                    'sales_total' =>
                    (float) $customer
                        ->sales_total,

                    'paid_amount' =>
                    (float) $customer
                        ->paid_amount,

                    'due_amount' =>
                    (float) $customer
                        ->due_amount,
                ],
            )
            ->values();

        $inventorySummary =
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
                        ) AS quantity,

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

        $inventoryRows =
            DB::table('stock_batches')
            ->join(
                'products',
                'products.id',
                '=',
                'stock_batches.product_id',
            )
            ->join(
                'categories',
                'categories.id',
                '=',
                'products.category_id',
            )
            ->where(
                'stock_batches.available_quantity',
                '>',
                0,
            )
            ->selectRaw(
                '
                        products.id,
                        products.name,
                        products.unit,

                        categories.id
                            AS category_id,

                        categories.name
                            AS category_name,

                        SUM(
                            stock_batches.available_quantity
                        ) AS quantity,

                        SUM(
                            stock_batches.available_quantity
                            * stock_batches.purchase_cost
                        ) AS purchase_value,

                        SUM(
                            stock_batches.available_quantity
                            * stock_batches.selling_price
                        ) AS retail_value,

                        COUNT(stock_batches.id)
                            AS batch_count,

                        MIN(
                            stock_batches.expiry_date
                        ) AS nearest_expiry
                    ',
            )
            ->groupBy(
                'products.id',
                'products.name',
                'products.unit',
                'categories.id',
                'categories.name',
            )
            ->orderByDesc(
                'purchase_value',
            )
            ->limit(100)
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

                    'category' => [
                        'id' =>
                        (int) $product
                            ->category_id,

                        'name' =>
                        (string) $product
                            ->category_name,
                    ],

                    'quantity' =>
                    (float) $product
                        ->quantity,

                    'purchase_value' =>
                    (float) $product
                        ->purchase_value,

                    'retail_value' =>
                    (float) $product
                        ->retail_value,

                    'batch_count' =>
                    (int) $product
                        ->batch_count,

                    'nearest_expiry' =>
                    $product->nearest_expiry
                        ? (string) $product
                            ->nearest_expiry
                        : null,
                ],
            )
            ->values();

        $businessToday =
            $businessNow
            ->toDateString();

        $businessExpiryLimit =
            $businessNow
            ->copy()
            ->addDays(30)
            ->toDateString();

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
                    $businessToday,
                    $businessExpiryLimit,
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
                $businessToday,
            )
            ->count();

        return response()->json([
            'data' => [
                'period' => [
                    'date_from' =>
                    $dateFrom,

                    'date_to' =>
                    $dateTo,
                ],

                'summary' => [
                    'sales_count' =>
                    (int) (
                        $salesSummary
                        ?->sales_count
                        ?? 0
                    ),

                    'sales_total' =>
                    (float) (
                        $salesSummary
                        ?->sales_total
                        ?? 0
                    ),

                    'collected_amount' =>
                    $collectedAmount,

                    'due_amount' =>
                    (float) (
                        $salesSummary
                        ?->due_amount
                        ?? 0
                    ),

                    'discount_total' =>
                    (float) (
                        $salesSummary
                        ?->discount_total
                        ?? 0
                    ),

                    'gross_profit' =>
                    (float) (
                        $salesSummary
                        ?->gross_profit
                        ?? 0
                    ),

                    'sale_net_profit' =>
                    $saleNetProfit,

                    'return_count' =>
                    (int) (
                        $returnSummary
                        ?->return_count
                        ?? 0
                    ),

                    'return_refund' =>
                    (float) (
                        $returnSummary
                        ?->refund_amount
                        ?? 0
                    ),

                    'profit_reversal' =>
                    $profitReversal,

                    'expense_count' =>
                    (int) (
                        $expenseSummary
                        ?->expense_count
                        ?? 0
                    ),

                    'expense_total' =>
                    $expenseTotal,

                    'final_net_profit' =>
                    $finalNetProfit,
                ],

                'daily_series' =>
                $dailySeries,

                'payment_breakdown' =>
                $paymentBreakdown,

                'product_performance' =>
                $productPerformance,

                'expense_categories' =>
                $expenseCategories,

                'customer_dues' =>
                $customerDues,

                'inventory' => [
                    'summary' => [
                        'quantity' =>
                        (float) (
                            $inventorySummary
                            ?->quantity
                            ?? 0
                        ),

                        'purchase_value' =>
                        (float) (
                            $inventorySummary
                            ?->purchase_value
                            ?? 0
                        ),

                        'retail_value' =>
                        (float) (
                            $inventorySummary
                            ?->retail_value
                            ?? 0
                        ),

                        'expiring_batch_count' =>
                        $expiringBatchCount,

                        'expired_batch_count' =>
                        $expiredBatchCount,
                    ],

                    'products' =>
                    $inventoryRows,
                ],

                'generated_at' =>
                now()->toISOString(),
            ],
        ]);
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function dailySeries(
        Carbon $start,
        Carbon $end,
        Builder $salesQuery,
        Builder $collectionQuery,
        Builder $expenseQuery,
        Builder $returnQuery,
    ): Collection {
        $sales =
            (clone $salesQuery)
            ->selectRaw(
                '
                        DATE(
                            CONVERT_TZ(
                                sale_date,
                                \'+00:00\',
                                \'+05:30\'
                            )
                        ) AS report_date,

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
            (clone $collectionQuery)
            ->selectRaw(
                '
                        DATE(
                            CONVERT_TZ(
                                created_at,
                                \'+00:00\',
                                \'+05:30\'
                            )
                        ) AS report_date,

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
            (clone $expenseQuery)
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
            (clone $returnQuery)
            ->selectRaw(
                '
                        DATE(
                            CONVERT_TZ(
                                return_date,
                                \'+00:00\',
                                \'+05:30\'
                            )
                        ) AS report_date,

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

        $series =
            collect();

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
}
