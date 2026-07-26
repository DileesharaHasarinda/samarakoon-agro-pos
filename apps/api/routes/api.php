<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BarcodeController;
use App\Http\Controllers\Api\BusinessSettingController;
use App\Http\Controllers\Api\CashierAccountController;
use App\Http\Controllers\Api\CashierShiftController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\CustomerDueController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DatabaseBackupController;
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
                    'status' => 'ok',

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
                 */
                Route::get(
                    '/dashboard/cashier',
                    [
                        DashboardController::class,
                        'cashier',
                    ],
                );

                /*
                 * Business settings used by
                 * receipts and invoices.
                 */
                Route::get(
                    '/business-settings',
                    [
                        BusinessSettingController::class,
                        'show',
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
                 * before collecting due payments.
                 *
                 * Admin accounts are allowed by the
                 * EnsureOpenCashierShift middleware.
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
                 *
                 * These routes must remain before
                 * the dynamic /sales/{sale} route.
                 */
                Route::get(
                    '/sales/{sale}/return-options',
                    [
                        SalesReturnController::class,
                        'returnOptions',
                    ],
                );

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
                 * Sales routes.
                 *
                 * Only sale creation requires
                 * an open cashier shift.
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
                 * management.
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
                 * Admin dashboard.
                 */
                Route::get(
                    '/dashboard/admin',
                    [
                        DashboardController::class,
                        'admin',
                    ],
                );

                /*
                 * Business settings update.
                 */
                Route::put(
                    '/business-settings',
                    [
                        BusinessSettingController::class,
                        'update',
                    ],
                );

                /*
                 * Reports.
                 */
                Route::get(
                    '/reports/overview',
                    [
                        ReportController::class,
                        'overview',
                    ],
                );

                /*
                 * Backup and Restore.
                 *
                 * These endpoints are restricted
                 * to administrator accounts.
                 */
                Route::get(
                    '/database-backups',
                    [
                        DatabaseBackupController::class,
                        'index',
                    ],
                );

                Route::post(
                    '/database-backups',
                    [
                        DatabaseBackupController::class,
                        'store',
                    ],
                );

                Route::get(
                    '/database-backups/{databaseBackup}/download',
                    [
                        DatabaseBackupController::class,
                        'download',
                    ],
                );

                Route::post(
                    '/database-backups/{databaseBackup}/restore',
                    [
                        DatabaseBackupController::class,
                        'restore',
                    ],
                );

                Route::delete(
                    '/database-backups/{databaseBackup}',
                    [
                        DatabaseBackupController::class,
                        'destroy',
                    ],
                );

                /*
                 * Barcode Management.
                 *
                 * These routes are declared before
                 * the product apiResource routes.
                 */
                Route::get(
                    '/barcodes/products',
                    [
                        BarcodeController::class,
                        'index',
                    ],
                );

                Route::post(
                    '/barcodes/generate-missing',
                    [
                        BarcodeController::class,
                        'generateMissing',
                    ],
                );

                Route::post(
                    '/products/{product}/barcode/generate',
                    [
                        BarcodeController::class,
                        'generate',
                    ],
                );

                Route::put(
                    '/products/{product}/barcode',
                    [
                        BarcodeController::class,
                        'update',
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

                /*
                 * Admin access test.
                 */
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
                 * These routes must be placed
                 * before dynamic resource routes.
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
