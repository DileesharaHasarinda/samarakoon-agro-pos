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

        $inventoryBatches =
            DB::table('stock_batches')
            ->join(
                'products',
                'products.id',
                '=',
                'stock_batches.product_id',
            )
            ->leftJoin(
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
            ->get([
                'stock_batches.id',
                'stock_batches.product_id',
                'stock_batches.available_quantity',
                'stock_batches.purchase_cost',
                'stock_batches.selling_price',
                'stock_batches.is_dual_unit',
                'stock_batches.stock_unit',
                'stock_batches.secondary_unit',
                'stock_batches.conversion_factor',
                'stock_batches.secondary_selling_price',
                'stock_batches.base_unit_cost',
                'stock_batches.expiry_date',

                'products.name AS product_name',
                'products.unit AS product_unit',

                'categories.id AS category_id',
                'categories.name AS category_name',
            ])
            ->map(
                function (
                    object $batch,
                ): array {
                    $availableQuantity =
                        max(
                            0,
                            (float) (
                                $batch
                                ->available_quantity
                                ?? 0
                            ),
                        );

                    $conversionFactor =
                        max(
                            1,
                            (float) (
                                $batch
                                ->conversion_factor
                                ?? 1
                            ),
                        );

                    $secondaryUnit =
                        $this->cleanInventoryUnit(
                            $batch
                                ->secondary_unit
                                ?? null,
                        );

                    $storedStockUnit =
                        $this->cleanInventoryUnit(
                            $batch
                                ->stock_unit
                                ?? null,
                        );

                    $productUnit =
                        $this->cleanInventoryUnit(
                            $batch
                                ->product_unit
                                ?? null,
                        )
                        ?? 'Unit';

                    $isDualUnit =
                        $this->inventoryBoolean(
                            $batch
                                ->is_dual_unit
                                ?? false,
                        )
                        || (
                            $secondaryUnit
                            !== null
                            && $conversionFactor
                            > 1
                        );

                    $stockUnit =
                        $this->resolveInventoryStockUnit(
                            $productUnit,
                            $isDualUnit,
                            $storedStockUnit,
                            $secondaryUnit,
                            $conversionFactor,
                        );

                    $purchaseCost =
                        (float) (
                            $batch
                            ->purchase_cost
                            ?? 0
                        );

                    $sellingPrice =
                        (float) (
                            $batch
                            ->selling_price
                            ?? 0
                        );

                    $baseUnitCost =
                        $batch
                        ->base_unit_cost
                        !== null
                        && (float) $batch
                            ->base_unit_cost
                        > 0
                        ? (float) $batch
                            ->base_unit_cost
                        : null;

                    $secondarySellingPrice =
                        $batch
                        ->secondary_selling_price
                        !== null
                        ? (float) $batch
                            ->secondary_selling_price
                        : null;

                    $purchaseValue =
                        $this->inventoryBatchPurchaseValue(
                            availableQuantity: $availableQuantity,
                            purchaseCost: $purchaseCost,
                            baseUnitCost: $baseUnitCost,
                            conversionFactor: $conversionFactor,
                            isDualUnit: $isDualUnit,
                        );

                    $retailValue =
                        $this->inventoryBatchRetailValue(
                            availableQuantity: $availableQuantity,
                            sellingPrice: $sellingPrice,
                            secondarySellingPrice: $secondarySellingPrice,
                            conversionFactor: $conversionFactor,
                            isDualUnit: $isDualUnit,
                        );

                    return [
                        'id' =>
                        (int) $batch->id,

                        'product_id' =>
                        (int) $batch
                            ->product_id,

                        'product_name' =>
                        (string) $batch
                            ->product_name,

                        'product_unit' =>
                        $productUnit,

                        'category_id' =>
                        $batch
                            ->category_id
                            !== null
                            ? (int) $batch
                                ->category_id
                            : 0,

                        'category_name' =>
                        $this->cleanInventoryUnit(
                            $batch
                                ->category_name
                                ?? null,
                        )
                            ?? 'Uncategorized',

                        'available_quantity' =>
                        round(
                            $availableQuantity,
                            3,
                        ),

                        'stock_unit' =>
                        $stockUnit,

                        'purchase_value' =>
                        $purchaseValue,

                        'retail_value' =>
                        $retailValue,

                        'expiry_date' =>
                        $batch
                            ->expiry_date
                            !== null
                            ? (string) $batch
                                ->expiry_date
                            : null,
                    ];
                },
            )
            ->values();

        $inventoryQuantityByUnit =
            $this->inventoryQuantityByUnit(
                $inventoryBatches,
            );

        $inventoryPurchaseValue =
            round(
                (float) $inventoryBatches
                    ->sum(
                        'purchase_value',
                    ),
                2,
            );

        $inventoryRetailValue =
            round(
                (float) $inventoryBatches
                    ->sum(
                        'retail_value',
                    ),
                2,
            );

        /*
         * Keep the old numeric quantity field for API backward
         * compatibility. The authoritative display value is
         * quantity_display / quantity_by_unit because quantities
         * with different units must never be presented as one unit.
         */
        $inventoryQuantity =
            count(
                $inventoryQuantityByUnit,
            ) === 1
            ? (float) (
                $inventoryQuantityByUnit[0]['quantity']
                ?? 0
            )
            : round(
                (float) $inventoryBatches
                    ->sum(
                        'available_quantity',
                    ),
                3,
            );

        $inventoryRows =
            $inventoryBatches
            ->groupBy(
                'product_id',
            )
            ->map(
                function (
                    Collection $batches,
                ): array {
                    $first =
                        $batches->first();

                    $quantityByUnit =
                        $this->inventoryQuantityByUnit(
                            $batches,
                        );

                    $singleStockUnit =
                        count(
                            $quantityByUnit,
                        ) === 1
                        ? (string) (
                            $quantityByUnit[0]['unit']
                            ?? 'Unit'
                        )
                        : 'Mixed';

                    $quantity =
                        count(
                            $quantityByUnit,
                        ) === 1
                        ? (float) (
                            $quantityByUnit[0]['quantity']
                            ?? 0
                        )
                        : round(
                            (float) $batches
                                ->sum(
                                    'available_quantity',
                                ),
                            3,
                        );

                    $nearestExpiry =
                        $batches
                        ->pluck(
                            'expiry_date',
                        )
                        ->filter(
                            fn(
                                mixed $value,
                            ): bool =>
                            is_string(
                                $value,
                            )
                                && trim(
                                    $value,
                                ) !== '',
                        )
                        ->sort()
                        ->first();

                    return [
                        'id' =>
                        (int) (
                            $first['product_id']
                            ?? 0
                        ),

                        'name' =>
                        (string) (
                            $first['product_name']
                            ?? ''
                        ),

                        /*
                         * `unit` is kept for backward compatibility,
                         * but now correctly represents the physical
                         * stock unit instead of products.unit.
                         */
                        'unit' =>
                        $singleStockUnit,

                        'stock_unit' =>
                        $singleStockUnit,

                        'quantity' =>
                        $quantity,

                        'quantity_by_unit' =>
                        $quantityByUnit,

                        'quantity_display' =>
                        $this->inventoryQuantityDisplay(
                            $quantityByUnit,
                        ),

                        'category' => [
                            'id' =>
                            (int) (
                                $first['category_id']
                                ?? 0
                            ),

                            'name' =>
                            (string) (
                                $first['category_name']
                                ?? 'Uncategorized'
                            ),
                        ],

                        'purchase_value' =>
                        round(
                            (float) $batches
                                ->sum(
                                    'purchase_value',
                                ),
                            2,
                        ),

                        'retail_value' =>
                        round(
                            (float) $batches
                                ->sum(
                                    'retail_value',
                                ),
                            2,
                        ),

                        'batch_count' =>
                        $batches->count(),

                        'nearest_expiry' =>
                        $nearestExpiry
                            ? (string) $nearestExpiry
                            : null,
                    ];
                },
            )
            ->sortByDesc(
                'purchase_value',
            )
            ->take(100)
            ->values();

        /*
         * =========================================================
         * ALL-TIME FULL INVENTORY / PRICE HISTORY
         * =========================================================
         *
         * This view is intentionally NOT limited by the report date range
         * and NOT limited to batches with current available stock.
         *
         * Rows are separated by:
         * product + exact variant + purchase cost + selling price +
         * secondary selling price + units/conversion.
         *
         * Therefore a 100g variant with two historical price combinations
         * is returned as two different rows.
         */
        $fullInventoryHistoryBatches =
            DB::table('stock_batches')
            ->join(
                'products',
                'products.id',
                '=',
                'stock_batches.product_id',
            )
            ->leftJoin(
                'categories',
                'categories.id',
                '=',
                'products.category_id',
            )
            ->leftJoin(
                'product_variants',
                'product_variants.id',
                '=',
                'stock_batches.product_variant_id',
            )
            ->get([
                'stock_batches.id',
                'stock_batches.product_id',
                'stock_batches.product_variant_id',
                'stock_batches.received_quantity',
                'stock_batches.available_quantity',
                'stock_batches.purchase_cost',
                'stock_batches.selling_price',
                'stock_batches.is_dual_unit',
                'stock_batches.stock_unit',
                'stock_batches.secondary_unit',
                'stock_batches.conversion_factor',
                'stock_batches.secondary_selling_price',

                'products.name AS product_name',
                'products.unit AS product_unit',

                'product_variants.size_value AS variant_size_value',
                'product_variants.size_unit AS variant_size_unit',
                'product_variants.package_unit AS variant_package_unit',

                'categories.id AS category_id',
                'categories.name AS category_name',
            ])
            ->map(
                function (
                    object $batch,
                ): array {
                    $productUnit =
                        $this->cleanInventoryUnit(
                            $batch
                                ->product_unit
                                ?? null,
                        )
                        ?? 'Unit';

                    $variantPackageUnit =
                        $this->cleanInventoryUnit(
                            $batch
                                ->variant_package_unit
                                ?? null,
                        );

                    $priceUnit =
                        $variantPackageUnit
                        ?? $productUnit;

                    $secondaryUnit =
                        $this->cleanInventoryUnit(
                            $batch
                                ->secondary_unit
                                ?? null,
                        );

                    $storedStockUnit =
                        $this->cleanInventoryUnit(
                            $batch
                                ->stock_unit
                                ?? null,
                        );

                    $conversionFactor =
                        max(
                            1,
                            (float) (
                                $batch
                                ->conversion_factor
                                ?? 1
                            ),
                        );

                    $isDualUnit =
                        $this->inventoryBoolean(
                            $batch
                                ->is_dual_unit
                                ?? false,
                        )
                        || (
                            $secondaryUnit
                            !== null
                            && $conversionFactor > 1
                        );

                    $stockUnit =
                        $this->resolveInventoryStockUnit(
                            $priceUnit,
                            $isDualUnit,
                            $storedStockUnit,
                            $secondaryUnit,
                            $conversionFactor,
                        );

                    $variantId =
                        $batch
                        ->product_variant_id
                        !== null
                        ? (int) $batch
                            ->product_variant_id
                        : null;

                    $variantName =
                        'Standard';

                    if (
                        $variantId !== null
                    ) {
                        $variantSizeValue =
                            $batch
                            ->variant_size_value
                            !== null
                            ? $this->formatInventoryQuantity(
                                (float) $batch
                                    ->variant_size_value,
                            )
                            : '';

                        $variantSizeUnit =
                            $this->cleanInventoryUnit(
                                $batch
                                    ->variant_size_unit
                                    ?? null,
                            )
                            ?? '';

                        $variantName =
                            trim(
                                $variantSizeValue
                                    . $variantSizeUnit,
                            );

                        if (
                            $variantName === ''
                        ) {
                            $variantName =
                                'Variant #'
                                . $variantId;
                        }
                    }

                    return [
                        'batch_id' =>
                        (int) $batch->id,

                        'product_id' =>
                        (int) $batch
                            ->product_id,

                        'product_name' =>
                        (string) $batch
                            ->product_name,

                        'product_variant_id' =>
                        $variantId,

                        'variant_name' =>
                        $variantName,

                        'category_id' =>
                        $batch
                            ->category_id
                            !== null
                            ? (int) $batch
                                ->category_id
                            : 0,

                        'category_name' =>
                        $this->cleanInventoryUnit(
                            $batch
                                ->category_name
                                ?? null,
                        )
                            ?? 'Uncategorized',

                        'price_unit' =>
                        $priceUnit,

                        'stock_unit' =>
                        $stockUnit,

                        'secondary_unit' =>
                        $secondaryUnit,

                        'conversion_factor' =>
                        round(
                            $conversionFactor,
                            6,
                        ),

                        'purchase_cost' =>
                        $batch
                            ->purchase_cost
                            !== null
                            ? round(
                                (float) $batch
                                    ->purchase_cost,
                                4,
                            )
                            : null,

                        'selling_price' =>
                        $batch
                            ->selling_price
                            !== null
                            ? round(
                                (float) $batch
                                    ->selling_price,
                                4,
                            )
                            : null,

                        'secondary_selling_price' =>
                        $batch
                            ->secondary_selling_price
                            !== null
                            ? round(
                                (float) $batch
                                    ->secondary_selling_price,
                                4,
                            )
                            : null,

                        'received_quantity' =>
                        round(
                            max(
                                0,
                                (float) (
                                    $batch
                                    ->received_quantity
                                    ?? 0
                                ),
                            ),
                            3,
                        ),

                        'available_quantity' =>
                        round(
                            max(
                                0,
                                (float) (
                                    $batch
                                    ->available_quantity
                                    ?? 0
                                ),
                            ),
                            3,
                        ),
                    ];
                },
            )
            ->values();

        $fullInventoryRows =
            $fullInventoryHistoryBatches
            ->groupBy(
                function (
                    array $batch,
                ): string {
                    $priceKey =
                        static function (
                            mixed $value,
                        ): string {
                            if (
                                $value === null
                            ) {
                                return 'NULL';
                            }

                            return number_format(
                                (float) $value,
                                6,
                                '.',
                                '',
                            );
                        };

                    return implode(
                        '|',
                        [
                            (string) (
                                $batch['product_id']
                                ?? 0
                            ),

                            (string) (
                                $batch['product_variant_id']
                                ?? 0
                            ),

                            mb_strtolower(
                                (string) (
                                    $batch['price_unit']
                                    ?? 'Unit'
                                ),
                            ),

                            mb_strtolower(
                                (string) (
                                    $batch['stock_unit']
                                    ?? 'Unit'
                                ),
                            ),

                            $priceKey(
                                $batch['purchase_cost']
                                    ?? null,
                            ),

                            $priceKey(
                                $batch['selling_price']
                                    ?? null,
                            ),

                            $priceKey(
                                $batch['secondary_selling_price']
                                    ?? null,
                            ),

                            $priceKey(
                                $batch['conversion_factor']
                                    ?? 1,
                            ),
                        ],
                    );
                },
            )
            ->map(
                function (
                    Collection $batches,
                    string $rowKey,
                ): array {
                    $first =
                        $batches->first();

                    return [
                        'row_key' =>
                        $rowKey,

                        'product_id' =>
                        (int) (
                            $first['product_id']
                            ?? 0
                        ),

                        'product_name' =>
                        (string) (
                            $first['product_name']
                            ?? ''
                        ),

                        'product_variant_id' =>
                        isset(
                            $first['product_variant_id'],
                        )
                            && $first['product_variant_id']
                            !== null
                            ? (int) $first['product_variant_id']
                            : null,

                        'variant_name' =>
                        (string) (
                            $first['variant_name']
                            ?? 'Standard'
                        ),

                        'category' => [
                            'id' =>
                            (int) (
                                $first['category_id']
                                ?? 0
                            ),

                            'name' =>
                            (string) (
                                $first['category_name']
                                ?? 'Uncategorized'
                            ),
                        ],

                        'price_unit' =>
                        (string) (
                            $first['price_unit']
                            ?? 'Unit'
                        ),

                        'stock_unit' =>
                        (string) (
                            $first['stock_unit']
                            ?? 'Unit'
                        ),

                        'secondary_unit' =>
                        $first['secondary_unit']
                            !== null
                            ? (string) $first['secondary_unit']
                            : null,

                        'conversion_factor' =>
                        (float) (
                            $first['conversion_factor']
                            ?? 1
                        ),

                        'purchase_cost' =>
                        $first['purchase_cost']
                            !== null
                            ? (float) $first['purchase_cost']
                            : null,

                        'selling_price' =>
                        $first['selling_price']
                            !== null
                            ? (float) $first['selling_price']
                            : null,

                        'secondary_selling_price' =>
                        $first['secondary_selling_price']
                            !== null
                            ? (float) $first['secondary_selling_price']
                            : null,

                        'total_received_quantity' =>
                        round(
                            (float) $batches
                                ->sum(
                                    'received_quantity',
                                ),
                            3,
                        ),

                        'remaining_quantity' =>
                        round(
                            (float) $batches
                                ->sum(
                                    'available_quantity',
                                ),
                            3,
                        ),

                        'batch_count' =>
                        $batches->count(),
                    ];
                },
            )
            /*
             * Only keep exact variant / price combinations that still have
             * physical stock in the current inventory.
             *
             * Example:
             * Tomato Seeds | 100g | Cost 100 | Sale 230 | Remaining 0
             *     -> hidden
             *
             * Tomato Seeds | 100g | Cost 150 | Sale 300 | Remaining 10
             *     -> displayed
             */
            ->filter(
                fn(
                    array $row,
                ): bool =>
                (float) (
                    $row['remaining_quantity']
                    ?? 0
                ) > 0.0001,
            )
            ->sortBy(
                function (
                    array $row,
                ): string {
                    return implode(
                        '|',
                        [
                            mb_strtolower(
                                (string) (
                                    $row['product_name']
                                    ?? ''
                                ),
                            ),

                            mb_strtolower(
                                (string) (
                                    $row['variant_name']
                                    ?? ''
                                ),
                            ),

                            number_format(
                                (float) (
                                    $row['purchase_cost']
                                    ?? 0
                                ),
                                6,
                                '.',
                                '',
                            ),

                            number_format(
                                (float) (
                                    $row['selling_price']
                                    ?? 0
                                ),
                                6,
                                '.',
                                '',
                            ),
                        ],
                    );
                },
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
                        $inventoryQuantity,

                        'quantity_by_unit' =>
                        $inventoryQuantityByUnit,

                        'quantity_display' =>
                        $this->inventoryQuantityDisplay(
                            $inventoryQuantityByUnit,
                        ),

                        'purchase_value' =>
                        $inventoryPurchaseValue,

                        'retail_value' =>
                        $inventoryRetailValue,

                        'expiring_batch_count' =>
                        $expiringBatchCount,

                        'expired_batch_count' =>
                        $expiredBatchCount,
                    ],

                    'products' =>
                    $inventoryRows,

                    'full_history' =>
                    $fullInventoryRows,
                ],

                'generated_at' =>
                now()->toISOString(),
            ],
        ]);
    }

    /*
     * =========================================================
     * INVENTORY REPORT HELPERS
     * =========================================================
     */

    private function cleanInventoryUnit(
        mixed $value,
    ): ?string {
        if (
            ! is_string(
                $value,
            )
            && ! is_numeric(
                $value,
            )
        ) {
            return null;
        }

        $unit =
            trim(
                (string) $value,
            );

        return $unit !== ''
            ? $unit
            : null;
    }

    private function inventoryBoolean(
        mixed $value,
    ): bool {
        if (
            is_bool(
                $value,
            )
        ) {
            return $value;
        }

        if (
            is_numeric(
                $value,
            )
        ) {
            return (int) $value === 1;
        }

        if (
            is_string(
                $value,
            )
        ) {
            return in_array(
                strtolower(
                    trim(
                        $value,
                    ),
                ),
                [
                    '1',
                    'true',
                    'yes',
                    'on',
                ],
                true,
            );
        }

        return false;
    }

    private function resolveInventoryStockUnit(
        string $productUnit,
        bool $isDualUnit,
        ?string $stockUnit,
        ?string $secondaryUnit,
        float $conversionFactor,
    ): string {
        /*
         * Dual-unit example:
         *
         *     product.unit    = Bag
         *     secondary_unit = Kg
         *     stock unit     = Kg
         */
        if (
            $isDualUnit
            && $conversionFactor > 1
            && $secondaryUnit !== null
        ) {
            return $secondaryUnit;
        }

        if (
            $stockUnit !== null
        ) {
            return $stockUnit;
        }

        if (
            $secondaryUnit !== null
            && $conversionFactor > 1
        ) {
            return $secondaryUnit;
        }

        return $productUnit !== ''
            ? $productUnit
            : 'Unit';
    }

    private function inventoryBatchPurchaseValue(
        float $availableQuantity,
        float $purchaseCost,
        ?float $baseUnitCost,
        float $conversionFactor,
        bool $isDualUnit,
    ): float {
        if (
            $availableQuantity <= 0
        ) {
            return 0.0;
        }

        if (
            $isDualUnit
            && $conversionFactor > 0
        ) {
            $costPerPhysicalUnit =
                $baseUnitCost !== null
                && $baseUnitCost > 0
                ? $baseUnitCost
                : (
                    $purchaseCost
                    / $conversionFactor
                );

            return
                $availableQuantity
                * $costPerPhysicalUnit;
        }

        return
            $availableQuantity
            * $purchaseCost;
    }

    private function inventoryBatchRetailValue(
        float $availableQuantity,
        float $sellingPrice,
        ?float $secondarySellingPrice,
        float $conversionFactor,
        bool $isDualUnit,
    ): float {
        if (
            $availableQuantity <= 0
        ) {
            return 0.0;
        }

        if (
            ! $isDualUnit
            || $conversionFactor <= 0
        ) {
            return
                $availableQuantity
                * $sellingPrice;
        }

        /*
         * Example:
         *
         * 75 Kg remaining
         * 1 Bag = 50 Kg
         *
         * full main units = 1 Bag
         * loose remainder = 25 Kg
         */
        $fullPrimaryUnits =
            floor(
                (
                    $availableQuantity
                    + 0.0000001
                )
                    / $conversionFactor,
            );

        $looseQuantity =
            max(
                0,
                $availableQuantity
                    - (
                        $fullPrimaryUnits
                        * $conversionFactor
                    ),
            );

        $looseSellingPrice =
            $secondarySellingPrice
            !== null
            ? $secondarySellingPrice
            : (
                $conversionFactor > 0
                ? (
                    $sellingPrice
                    / $conversionFactor
                )
                : 0
            );

        return (
            $fullPrimaryUnits
            * $sellingPrice
        )
            + (
                $looseQuantity
                * $looseSellingPrice
            );
    }

    /**
     * @param Collection<int, array<string, mixed>> $batches
     *
     * @return array<int, array{unit: string, quantity: float}>
     */
    private function inventoryQuantityByUnit(
        Collection $batches,
    ): array {
        $units = [];

        foreach (
            $batches
            as $batch
        ) {
            $unit =
                $this->cleanInventoryUnit(
                    $batch['stock_unit']
                        ?? null,
                )
                ?? 'Unit';

            $key =
                mb_strtolower(
                    $unit,
                );

            if (
                ! isset(
                    $units[$key],
                )
            ) {
                $units[$key] = [
                    'unit' =>
                    $unit,

                    'quantity' =>
                    0.0,
                ];
            }

            $units[$key]['quantity'] =
                round(
                    (float) $units[$key]['quantity']
                        + (float) (
                            $batch['available_quantity']
                            ?? 0
                        ),
                    3,
                );
        }

        return array_values(
            $units,
        );
    }

    /**
     * @param array<int, array{unit: string, quantity: float}> $quantityByUnit
     */
    private function inventoryQuantityDisplay(
        array $quantityByUnit,
    ): string {
        if (
            $quantityByUnit === []
        ) {
            return '0 Unit';
        }

        return collect(
            $quantityByUnit,
        )
            ->map(
                fn(
                    array $item,
                ): string =>
                $this->formatInventoryQuantity(
                    (float) (
                        $item['quantity']
                        ?? 0
                    ),
                )
                    . ' '
                    . (
                        $this->cleanInventoryUnit(
                            $item['unit']
                                ?? null,
                        )
                        ?? 'Unit'
                    ),
            )
            ->implode(
                ' • ',
            );
    }

    private function formatInventoryQuantity(
        float $quantity,
    ): string {
        $formatted =
            number_format(
                round(
                    $quantity,
                    3,
                ),
                3,
                '.',
                '',
            );

        $formatted =
            rtrim(
                rtrim(
                    $formatted,
                    '0',
                ),
                '.',
            );

        return $formatted !== ''
            ? $formatted
            : '0';
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
