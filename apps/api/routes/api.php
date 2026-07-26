<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CashierAccountController;
use App\Http\Controllers\Api\CashierShiftController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\CustomerDueController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExpenseCategoryController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\InventoryAlertController;
use App\Http\Controllers\Api\PosController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\PurchaseController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\SalesReturnController;
use App\Http\Controllers\Api\StockController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\SupplierPayableController;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')
    ->group(function (): void {
        /*
         * Public health-check route.
         */
        Route::get(
            '/health',
            function (): JsonResponse {
                return response()->json([
                    'status' =>
                    'ok',

                    'application' =>
                    'Samarakoon Agro POS API',

                    'timestamp' =>
                    now()->toISOString(),
                ]);
            },
        );

        /*
         * Authentication.
         */
        Route::post(
            '/auth/login',
            [
                AuthController::class,
                'login',
            ],
        )->middleware(
            'throttle:10,1',
        );

        Route::middleware(
            'auth:sanctum',
        )->group(function (): void {
            Route::get(
                '/auth/me',
                [
                    AuthController::class,
                    'me',
                ],
            );

            Route::post(
                '/auth/logout',
                [
                    AuthController::class,
                    'logout',
                ],
            );

            /*
             * Routes available to both
             * administrators and cashiers.
             */
            Route::middleware(
                'role:admin,cashier',
            )->group(function (): void {
                /*
                 * Cashier dashboard.
                 *
                 * Admin users can also access this
                 * endpoint when necessary.
                 */
                Route::get(
                    '/dashboard/cashier',
                    [
                        DashboardController::class,
                        'cashier',
                    ],
                );

                /*
                 * POS products and categories.
                 */
                Route::get(
                    '/pos/categories',
                    [
                        PosController::class,
                        'categories',
                    ],
                );

                Route::get(
                    '/pos/products',
                    [
                        PosController::class,
                        'index',
                    ],
                );

                Route::get(
                    '/pos/products/{product}',
                    [
                        PosController::class,
                        'show',
                    ],
                );

                /*
                 * Stock lookup.
                 */
                Route::get(
                    '/stock/products',
                    [
                        StockController::class,
                        'index',
                    ],
                );

                Route::get(
                    '/stock/products/{product}/price-options',
                    [
                        StockController::class,
                        'priceOptions',
                    ],
                );

                /*
                 * Customer management.
                 */
                Route::get(
                    '/customers/options',
                    [
                        CustomerController::class,
                        'options',
                    ],
                );

                Route::apiResource(
                    'customers',
                    CustomerController::class,
                )->only([
                    'index',
                    'store',
                    'show',
                    'update',
                ]);

                /*
                 * Customer due management.
                 */
                Route::get(
                    '/customer-dues',
                    [
                        CustomerDueController::class,
                        'index',
                    ],
                );

                Route::get(
                    '/customer-dues/{sale}',
                    [
                        CustomerDueController::class,
                        'show',
                    ],
                );

                /*
                 * Cashiers must have an open shift
                 * before collecting a due payment.
                 *
                 * Admin users are allowed through
                 * by EnsureOpenCashierShift.
                 */
                Route::post(
                    '/sales/{sale}/due-payments',
                    [
                        CustomerDueController::class,
                        'store',
                    ],
                )->middleware(
                    'shift.open',
                );

                /*
                 * Sales return routes.
                 */
                Route::get(
                    '/sales/{sale}/return-options',
                    [
                        SalesReturnController::class,
                        'returnOptions',
                    ],
                );

                /*
                 * Cashiers must have an open shift
                 * before processing a return.
                 */
                Route::post(
                    '/sales/{sale}/returns',
                    [
                        SalesReturnController::class,
                        'store',
                    ],
                )->middleware(
                    'shift.open',
                );

                Route::get(
                    '/sales-returns',
                    [
                        SalesReturnController::class,
                        'index',
                    ],
                );

                Route::get(
                    '/sales-returns/{salesReturn}',
                    [
                        SalesReturnController::class,
                        'show',
                    ],
                );

                /*
                 * Sales routes are declared
                 * separately because only sale
                 * creation requires an open shift.
                 */
                Route::get(
                    '/sales',
                    [
                        SaleController::class,
                        'index',
                    ],
                );

                Route::post(
                    '/sales',
                    [
                        SaleController::class,
                        'store',
                    ],
                )->middleware(
                    'shift.open',
                );

                Route::get(
                    '/sales/{sale}',
                    [
                        SaleController::class,
                        'show',
                    ],
                );

                /*
                 * Cashier shift and cash-register
                 * routes.
                 *
                 * Static routes are placed before
                 * the dynamic {cashierShift} route.
                 */
                Route::get(
                    '/cashier-shifts/current',
                    [
                        CashierShiftController::class,
                        'current',
                    ],
                );

                Route::get(
                    '/cashier-shifts',
                    [
                        CashierShiftController::class,
                        'index',
                    ],
                );

                Route::post(
                    '/cashier-shifts/open',
                    [
                        CashierShiftController::class,
                        'open',
                    ],
                );

                Route::get(
                    '/cashier-shifts/{cashierShift}',
                    [
                        CashierShiftController::class,
                        'show',
                    ],
                );

                Route::post(
                    '/cashier-shifts/{cashierShift}/close',
                    [
                        CashierShiftController::class,
                        'close',
                    ],
                );

                Route::post(
                    '/cashier-shifts/{cashierShift}/movements',
                    [
                        CashierShiftController::class,
                        'storeMovement',
                    ],
                );
            });

            /*
             * Administrator-only routes.
             */
            Route::middleware(
                'role:admin',
            )->group(function (): void {
                /*
                 * Admin dashboard and reports.
                 */
                Route::get(
                    '/dashboard/admin',
                    [
                        DashboardController::class,
                        'admin',
                    ],
                );

                Route::get(
                    '/reports/overview',
                    [
                        ReportController::class,
                        'overview',
                    ],
                );

                /*
                 * Low-stock and expiry management.
                 */
                Route::get(
                    '/inventory-alerts',
                    [
                        InventoryAlertController::class,
                        'index',
                    ],
                );

                Route::put(
                    '/products/{product}/stock-settings',
                    [
                        InventoryAlertController::class,
                        'updateSettings',
                    ],
                );

                /*
                 * Supplier payments and dues.
                 */
                Route::get(
                    '/supplier-payables',
                    [
                        SupplierPayableController::class,
                        'index',
                    ],
                );

                Route::get(
                    '/supplier-payables/{purchase}',
                    [
                        SupplierPayableController::class,
                        'show',
                    ],
                );

                Route::put(
                    '/purchases/{purchase}/settlement',
                    [
                        SupplierPayableController::class,
                        'configure',
                    ],
                );

                Route::post(
                    '/purchases/{purchase}/supplier-payments',
                    [
                        SupplierPayableController::class,
                        'storePayment',
                    ],
                );

                /*
                 * Customer deletion is restricted
                 * to administrators.
                 */
                Route::delete(
                    '/customers/{customer}',
                    [
                        CustomerController::class,
                        'destroy',
                    ],
                );

                Route::get(
                    '/admin/access-check',
                    function (): JsonResponse {
                        return response()->json([
                            'message' =>
                            'Admin access confirmed.',
                        ]);
                    },
                );

                /*
                 * Dropdown option endpoints.
                 *
                 * Keep these before apiResource
                 * dynamic routes such as
                 * /categories/{category}.
                 */
                Route::get(
                    '/categories/options',
                    [
                        CategoryController::class,
                        'options',
                    ],
                );

                Route::get(
                    '/products/options',
                    [
                        ProductController::class,
                        'options',
                    ],
                );

                Route::get(
                    '/suppliers/options',
                    [
                        SupplierController::class,
                        'options',
                    ],
                );

                Route::get(
                    '/expense-categories/options',
                    [
                        ExpenseCategoryController::class,
                        'options',
                    ],
                );

                /*
                 * Purchase receiving.
                 */
                Route::post(
                    '/purchases/{purchase}/receive',
                    [
                        PurchaseController::class,
                        'receive',
                    ],
                );

                /*
                 * Core administrator resources.
                 */
                Route::apiResource(
                    'categories',
                    CategoryController::class,
                );

                Route::apiResource(
                    'products',
                    ProductController::class,
                );

                Route::apiResource(
                    'suppliers',
                    SupplierController::class,
                );

                Route::apiResource(
                    'purchases',
                    PurchaseController::class,
                );

                Route::apiResource(
                    'expense-categories',
                    ExpenseCategoryController::class,
                );

                Route::apiResource(
                    'expenses',
                    ExpenseController::class,
                );

                /*
                 * Cashier account management.
                 */
                Route::get(
                    '/cashiers',
                    [
                        CashierAccountController::class,
                        'index',
                    ],
                );

                Route::post(
                    '/cashiers',
                    [
                        CashierAccountController::class,
                        'store',
                    ],
                );

                Route::get(
                    '/cashiers/{cashier}',
                    [
                        CashierAccountController::class,
                        'show',
                    ],
                );

                Route::put(
                    '/cashiers/{cashier}',
                    [
                        CashierAccountController::class,
                        'update',
                    ],
                );

                Route::patch(
                    '/cashiers/{cashier}/status',
                    [
                        CashierAccountController::class,
                        'updateStatus',
                    ],
                );

                Route::put(
                    '/cashiers/{cashier}/password',
                    [
                        CashierAccountController::class,
                        'resetPassword',
                    ],
                );
            });
        });
    });
